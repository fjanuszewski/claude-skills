import { useState, useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { trpc } from "./lib/trpc";

function Home() {
  const [status, setStatus] = useState<string>("Connecting...");

  useEffect(() => {
    trpc.health.query().then((data) => setStatus(data.status));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">{{PROJECT_NAME}}</h1>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
