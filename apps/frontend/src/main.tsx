import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Signup from "./signup";
import "./index.css";

const router = createBrowserRouter(
  [
    { path: "/", element: <App /> },
    { path: "/login", element: <Login /> },
    { path: "/signup", element: <Signup /> },
  ],

    
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
