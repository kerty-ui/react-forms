import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import "./tailwind.css";
import ExamplesLayout from "./pages/examples/layout.tsx" 

const router = createBrowserRouter([
    {
        path: "/",
        lazy: () => import("./pages/home"),
    },
    {
        path: "/examples",
        element: <ExamplesLayout />,
        children: [
            { index: true, element: <Navigate to="basic-forms" replace /> },
            { path: "basic-forms", lazy: () => import("./pages/examples/basic-forms") },
            { path: "basic-forms-validation", lazy: () => import("./pages/examples/basic-forms-validation") },
            { path: "complex-forms", lazy: () => import("./pages/examples/complex-forms") },
            {
                path: "*",
                element: <p>Sorry your searched example was not found or is deleted.</p>,
            }
        ],
    },
    {
        path: "*",
        element: <p>PAGE OT FOUND</p>,
    }
]);

export function App() {
    return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

