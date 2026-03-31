---
name: dynamo-erd
description: Use this skill when the user asks to "generar ERD", "crear diagrama de entidades DynamoDB", "mapear tablas DynamoDB", "documentar modelo de datos", "actualizar diagrama de base de datos", "generate DynamoDB ERD", "create entity relationship diagram", "diagramar base de datos", or any variation involving generating or updating an ERD diagram from DynamoDB table definitions.
version: 0.2.0
---

# DynamoDB ERD Generator Skill

Generate a Mermaid Entity-Relationship Diagram from DynamoDB table definitions and backend code. Works with any IaC framework (SST, CDK, CloudFormation, Terraform) or plain backend code.

## Output

A Markdown file with a Mermaid `erDiagram` block that renders natively in GitHub and VSCode (with Mermaid extension).

## Execution Flow

### Step 1: Collect Configuration

Use `AskUserQuestion` to gather (combine into 1–2 questions max):

| Variable | Question | Default |
|----------|---------|---------|
| `{{INFRA_SOURCE}}` | Where are the DynamoDB tables defined? (path to file/folder, or "auto-discover") | Auto-discover |
| `{{BACKEND_PATH}}` | Where is the backend code that uses the tables? (folder) | Auto-discover |
| `{{EXISTING_ERD}}` | Is there an existing ERD file to extend? (path or "no") | No (create new) |
| `{{OUTPUT_PATH}}` | Where to place the output file? | `./DATABASE.md` at project root |

If the user says "use defaults" or "auto-discover", proceed with auto-discovery (Step 2).

### Step 2: Discover DynamoDB Tables

If `{{INFRA_SOURCE}}` was not explicitly provided, search in order until tables are found:

**2a — SST v3:**
```
Grep: new sst\.aws\.Dynamo\(  in **/*.ts
```
Extract from each match: resource name (first string arg), variable name, fields, primaryIndex, globalIndexes.

**2b — AWS CDK (TypeScript):**
```
Grep: new\s+(dynamodb\.Table|aws_dynamodb\.Table)\(  in **/*.ts
```
Extract: table name, partitionKey, sortKey, globalSecondaryIndexes.

**2c — AWS CDK (Python):**
```
Grep: dynamodb\.Table\(  in **/*.py
```

**2d — CloudFormation / SAM:**
```
Grep: AWS::DynamoDB::Table  in **/*.yaml, **/*.yml, **/*.json
```
Extract: TableName, KeySchema, AttributeDefinitions, GlobalSecondaryIndexes.

**2e — Terraform:**
```
Grep: resource\s+"aws_dynamodb_table"  in **/*.tf
```
Extract: name, hash_key, range_key, global_secondary_index blocks.

**2f — Backend code (no IaC found):**
```
Grep: (DynamoDBClient|DynamoDB\.DocumentClient|new DynamoDB|boto3.*dynamodb)  in **/*.ts, **/*.js, **/*.py
```
Then in matching files:
```
Grep: TableName  to extract table names used in code.
```

For each table discovered, record:
- **Table name** (resource/logical name)
- **Code variable** (how it's referenced in backend code)
- **Partition key** (name + type)
- **Sort key** (name + type, if any)
- **GSIs** (index name, hash key, range key, projection)

### Step 3: Discover Entities per Table

For each table found, search in `{{BACKEND_PATH}}` (or the entire codebase if not specified):

**3a — Find files that use each table:**
- Grep for the table variable name, resource name, or `TableName: "..."` literal
- Collect all files that read/write to the table

**3b — Identify entity types by pk/sk patterns:**

In the files found, search for:
- Template literals: `` pk: `PREFIX#${ `` → entity prefix is `PREFIX`
- String literals: `pk: "LITERAL_VALUE"` → entity key is the literal
- String concatenation: `pk: "PREFIX#" +` → entity prefix is `PREFIX`
- Object patterns: `Key: { pk:` or `Item: { pk:`

Each unique pk prefix = one entity type in that table.

**3c — Discover entity attributes:**

For each entity type, look for:
- `PutCommand` / `PutItemCommand` / `put` items → the `Item` object contains all attributes
- `UpdateCommand` / `UpdateItemCommand` → `ExpressionAttributeValues` reveals additional attributes
- TypeScript interfaces/types near the put/update operations
- GSI key assignments (e.g., `gsi1pk: \`PATTERN#${value}\``) → document the access pattern

**3d — For each entity, record:**
- Entity name (derived from pk prefix, e.g., `FEEDBACK#` → `FEEDBACK`)
- Which DynamoDB table it lives in
- All attributes with types (string, number, boolean, json for objects/arrays)
- Which attributes are pk, sk (mark as PK)
- Which attributes are GSI keys (document the pattern in a comment)
- Which attributes look like foreign keys (end in `Id` or `_id` and reference another entity's prefix)

### Step 4: Discover Relationships Between Tables

**4a — Foreign key detection:**
For each entity, check attributes ending in `Id` or `_id`:
- Does the value get used as a key in another table? (search for `GetCommand` or `QueryCommand` using that value)
- Does the value match a pk prefix of another entity? (e.g., `epicGlobalId` → `EPIC#${epicGlobalId}`)

**4b — Cross-table query patterns:**
Search for code that:
1. Reads from table A
2. Uses a value from the result as a key to query table B
This reveals implicit foreign key relationships.

**4c — Same-table relationships (single-table design):**
If multiple entities share a table, check if:
- One entity's pk embeds another entity's ID (e.g., `NOTIF#${epicId}` where epicId references `EPIC#` in the same table)
- GSI keys reference other entity types

**4d — Determine cardinality:**
- One FEEDBACK has one EPIC → many-to-one (`}o--||`)
- One FEEDBACK has many MESSAGES → one-to-many (`||--o{`)
- One CONFIG has zero or one TEMPLATE → one-to-one optional (`|o--o|`)

Use the code patterns to infer: if the FK is on the "many" side (e.g., each FEEDBACK stores `epicGlobalId`), it's many-to-one.

### Step 5: Generate the Mermaid ERD File

Generate a `.md` file at `{{OUTPUT_PATH}}` with this structure:

```markdown
# Database Model — DynamoDB ERD

> Auto-generated on {{CURRENT_DATE}}
> Sources: `{{INFRA_SOURCE}}`, `{{BACKEND_PATH}}`

## Entity Relationship Diagram

\`\`\`mermaid
erDiagram
  ENTITY_NAME {
    string partitionKey PK "PREFIX#id"
    string sortKey PK "PREFIX#id"
    string attribute1
    string foreignField FK "FK TARGET_ENTITY"
    number numericField
    boolean flagField
    json complexField "nested object or array"
    string gsi1partitionKey "GSI1 PATTERN#value"
    string gsi1sortKey "GSI1 PATTERN#value"
  }

  ENTITY_A }o--|| ENTITY_B : "foreignField"
  ENTITY_C ||--o{ ENTITY_D : "sharedKey"
\`\`\`

## Tables & Entities

### TableName (IaC resource name)
- **Entities**: ENTITY_A, ENTITY_B (if single-table design)
- **Primary key**: pk (string) + sk (string)
- **GSIs**: gsi1 (gsi1pk/gsi1sk), gsi2 (gsi2pk/gsi2sk)
- **Note**: Single-table design — multiple entity types share this table

(repeat for each table)

## Access Patterns

### TableName

| Use Case | Operation | Key / Index | Key Condition |
|----------|-----------|-------------|---------------|
| Get entity by ID | GetItem | Primary | pk=PREFIX#id, sk=PREFIX#id |
| List by category | Query GSI1 | gsi1 | gsi1pk=CATEGORY#value |
| ... | ... | ... | ... |

(repeat for each table)
```

**Mermaid erDiagram rules:**
- Entity names: UPPER_SNAKE_CASE (e.g., `FEEDBACK`, `CONVERSATION_MESSAGE`, `ASSISTANT_CONFIG`)
- Attribute types: `string`, `number`, `boolean`, `json` (for objects/arrays)
- **CRITICAL — Reserved words**: Mermaid erDiagram treats `PK`, `FK`, and `UK` as constraint keywords. If an attribute NAME is `pk`, `sk`, `fk`, or `uk` (case-insensitive), the parser will fail with "Expecting ATTRIBUTE_WORD, got ATTRIBUTE_KEY". **Always rename** these to `partitionKey`, `sortKey`, etc. Same applies to GSI key attributes: use `gsi1partitionKey`/`gsi1sortKey` instead of `gsi1pk`/`gsi1sk`.
- **CRITICAL — Special characters in comments**: Mermaid comments (the quoted strings) must NOT contain `|`, `{`, `}`, or other Mermaid syntax characters. Use plain words instead (e.g., `"in_progress or completed"` instead of `"in_progress | completed"`).
- Mark partition key and sort key with `PK` constraint
- Mark foreign key attributes with `FK` constraint
- Add comments in quotes for pk/sk patterns and GSI patterns
- Relationship labels should be the FK field name

**Relationship notation:**
- `}o--||` = many-to-one (FK is on the left entity)
- `||--o{` = one-to-many (FK is on the right entity)
- `|o--o|` = one-to-one optional
- `}o--o{` = many-to-many (rare in DynamoDB)

**For single-table design entities:** Add a comment in the "Tables & Entities" section noting which entities share a table. In the Mermaid diagram, treat each entity type as a separate box regardless of whether they share a physical table.

### Step 6: Extend Existing File (if applicable)

If `{{EXISTING_ERD}}` was provided and points to an existing file:

1. Read the existing file
2. Parse the `erDiagram` Mermaid block — identify entity names already declared
3. For each newly discovered entity:
   - If entity name is NOT in the existing diagram → append it inside the `erDiagram` block
   - If entity name IS in the existing diagram → update its attributes (add new ones, keep existing)
4. For each relationship:
   - If the relationship pair (EntityA ↔ EntityB) is NOT already present → append it
5. Update the metadata line (date, sources)
6. Update "Tables & Entities" and "Access Patterns" sections similarly (add new, update existing)
7. Write the merged content back to the same file path

### Step 7: Report Results

Show a summary:
```
✅ ERD generated at {{OUTPUT_PATH}}

📊 Summary:
  - DynamoDB tables: N
  - Entities: N
  - Relationships: N
  - Files analyzed: N

💡 To view the diagram:
  - GitHub: renders automatically in the .md file
  - VSCode: install the "Markdown Preview Mermaid Support" extension
```
