import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = params.get("token");

        if (token) {
            localStorage.setItem("session_token", token);
            navigate("/");
        }
    }, []);

    return <div>Logging in...</div>;
}