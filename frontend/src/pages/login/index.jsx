import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import styles from "./style.module.css";
import { loginUser, registerUser } from "@/config/redux/action/authAction";
import { emptyMessage } from "@/config/redux/reducer/authReducer";
import clientServer from "@/config";
import Head from "next/head";
import Loader from "@/Components/Loader";

// --- Icons ---
const GoogleIcon = () => (
    <svg
        viewBox="0 0 24 24"
        style={{ width: "20px", height: "20px", marginRight: "10px" }}
    >
        <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

const GithubIcon = () => (
    <svg
        viewBox="0 0 24 24"
        style={{ width: "20px", height: "20px", marginRight: "10px" }}
        fill="currentColor"
    >
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
);

export default function LoginComponent() {
    const authState = useSelector((state) => state.auth);
    const router = useRouter();
    const dispatch = useDispatch();

    const [viewState, setViewState] = useState("login");
    const [signInData, setSignInData] = useState({ email: "", password: "" });
    const [signUpData, setSignUpData] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
    });
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotMessage, setForgotMessage] = useState("");
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    // --- NEW STATE FOR URL MESSAGES ---
    const [urlMessage, setUrlMessage] = useState("");

    // --- 1. HANDLE REDIRECT AFTER SOCIAL LOGIN & EMAIL VERIFICATION ---
    useEffect(() => {
        if (!router.isReady) return; // Ensure query is available

        if (router.query.token) {
            localStorage.setItem("token", router.query.token);
            localStorage.setItem("tokenTimestamp", Date.now().toString());
            window.location.href = "/";
        }

        // --- CHECK FOR VERIFIED QUERY PARAM ---
        if (router.query.verified === "true") {
            setUrlMessage("Email verified successfully! You can now login.");
            // Remove the query param from URL without refreshing
            router.replace("/login", undefined, { shallow: true });
        }
        if (router.query.message) {
            setUrlMessage(router.query.message);
            router.replace("/login", undefined, { shallow: true });
        }

        // --- NEW: HANDLE VIEW SWITCHING ---
        if (router.query.view === "register") {
            setViewState("register");
        }
    }, [router.isReady, router.query]);

    useEffect(() => {
        if (
            authState.loggedIn ||
            (typeof window !== "undefined" && localStorage.getItem("token"))
        ) {
            router.push("/");
        }
    }, [authState.loggedIn, router]);

    useEffect(() => {
        dispatch(emptyMessage());
        setForgotMessage("");
        // Note: We don't clear urlMessage here so it persists until view change
        if (viewState !== "login") {
            setRegistrationSuccess(false);
            setUrlMessage(""); // Clear it if user switches tabs
        }
    }, [viewState, dispatch]);

    const handleSignInChange = (e) =>
        setSignInData({ ...signInData, [e.target.name]: e.target.value });
    const handleSignUpChange = (e) =>
        setSignUpData({ ...signUpData, [e.target.name]: e.target.value });

    const handleSignInSubmit = (e) => {
        e.preventDefault();
        dispatch(loginUser(signInData));
    };

    const handleSignUpSubmit = async (e) => {
        e.preventDefault();
        const result = await dispatch(registerUser(signUpData));
        if (result.meta.requestStatus === "fulfilled") {
            // Note: Now registerUser returns success but NOT login token
            setRegistrationSuccess(true);
            setViewState("login");
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await clientServer.post("/forgot_password", {
                email: forgotEmail,
            });
            setForgotMessage(response.data.message);
        } catch (error) {
            setForgotMessage(error.response?.data?.message || "Request failed");
        }
    };

    const handleGoogleLogin = () => {
        window.open(
            `${
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090"
            }/auth/google`,
            "_self"
        );
    };

    const handleGithubLogin = () => {
        window.open(
            `${
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090"
            }/auth/github`,
            "_self"
        );
    };

    // Determine message to show and whether it's an error
    // Priority: forgotMessage > redux authState.message
    const rawMessage = viewState === "forgot"
        ? forgotMessage
        : authState.message?.message || authState.message;

    const authMessage = rawMessage || "";

    // isError: redux flag, but also check message content as fallback
    const isError =
        authState.isError ||
        (authMessage &&
            !authMessage.toLowerCase().includes("success") &&
            !authMessage.toLowerCase().includes("sent") &&
            !authMessage.toLowerCase().includes("verified") &&
            !authMessage.toLowerCase().includes("registering") &&
            !authMessage.toLowerCase().includes("knocking"));

    return (
        <div className={styles.authPageWrapper}>
            <Head>
                <title>Sign In | LinkUps</title>
                <meta name="description" content="Sign in to LinkUps — the professional networking platform for students and early-career professionals." />
            </Head>

            <div className={styles.ambientOrbTop}></div>
            <div className={styles.ambientOrbBottom}></div>

            <div className="container h-100 d-flex align-items-center justify-content-center">
                <div className={`row w-100 ${styles.authCardContainer}`}>
                    {/* LEFT SIDE */}
                    <div
                        className={`col-lg-6 d-none d-lg-flex flex-column justify-content-center align-items-center ${styles.visualPanel}`}
                    >
                        <div className={styles.hologramEffect}>
                            {/* Scanline removed — same reason as landing page: CRT effect is cyberpunk, not career platform */}
                            <img
                                src="/images/homemain_connection.jpg"
                                alt="LinkUps Network"
                                className={styles.visualImage}
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <h2 className={styles.visualTitle}>
                                Welcome to LinkUps
                            </h2>
                            <p className={styles.visualText}>
                                Build your resume, connect with peers,
                                and practice for your next interview — all in one place.
                            </p>
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="col-lg-6 col-12 d-flex align-items-center justify-content-center position-relative">
                        <div className={styles.glassForm}>
                            <div className={styles.formHeader}>
                                <div className={styles.loginLogo}>
                                    <span>Link</span>Ups
                                </div>
                                <h1 className={styles.formTitle}>
                                    {viewState === "login" && "Welcome Back"}
                                    {viewState === "register" &&
                                        "Create Account"}
                                    {viewState === "forgot" && "Reset Password"}
                                </h1>
                                <p className={styles.formSubtitle}>
                                    {viewState === "login" &&
                                        "Sign in to your account"}
                                    {viewState === "register" &&
                                        "Start building your career network"}
                                    {viewState === "forgot" &&
                                        "We'll send a reset link to your email"}
                                </p>
                            </div>

                            {/* --- LOGIN FORM --- */}
                            {viewState === "login" && (
                                <form onSubmit={handleSignInSubmit}>
                                    <button
                                        type="button"
                                        className={styles.socialBtn}
                                        onClick={handleGoogleLogin}
                                        style={{ marginBottom: "10px" }}
                                    >
                                        <GoogleIcon /> Continue with Google
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.socialBtn}
                                        onClick={handleGithubLogin}
                                    >
                                        <GithubIcon /> Continue with GitHub
                                    </button>

                                    <div className={styles.divider}>
                                        <span>OR</span>
                                    </div>

                                    <div className="mb-3">
                                        <label className={styles.holoLabel}>
                                            Email Address
                                        </label>
                                        <input
                                            className={styles.holoInput}
                                            name="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            onChange={handleSignInChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className={styles.holoLabel}>
                                            Password
                                        </label>
                                        <input
                                            className={styles.holoInput}
                                            name="password"
                                            type="password"
                                            placeholder="Enter your password"
                                            onChange={handleSignInChange}
                                            required
                                        />
                                    </div>

                                    {/* --- SUCCESS MESSAGES (Registration / Verification) --- */}
                                    {registrationSuccess && (
                                        <div className={styles.msgSuccess}>
                                            Registration Successful! Please
                                            check your email to verify account.
                                        </div>
                                    )}

                                    {urlMessage && !registrationSuccess && (
                                        <div className={styles.msgSuccess}>
                                            {urlMessage}
                                        </div>
                                    )}

                                    {/* --- AUTH ERROR/STATUS MESSAGES --- */}
                                    {authMessage &&
                                        !registrationSuccess &&
                                        !urlMessage && (
                                            <div
                                                className={
                                                    isError
                                                        ? styles.msgError
                                                        : styles.msgSuccess
                                                }
                                            >
                                                {authMessage}
                                            </div>
                                        )}

                                    <div className="d-flex justify-content-end mb-4">
                                        <span
                                            className={styles.linkAction}
                                            onClick={() =>
                                                setViewState("forgot")
                                            }
                                        >
                                            Forgot Password?
                                        </span>
                                    </div>
                                    <button
                                        type="submit"
                                        className={styles.btnNeon}
                                        disabled={authState.isLoading}
                                    >
                                        {authState.isLoading ? (
                                            <Loader variant="inline" label="Signing in..." />
                                        ) : (
                                            "Login"
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* --- REGISTER FORM --- */}
                            {viewState === "register" && (
                                <form onSubmit={handleSignUpSubmit}>
                                    <div className="mb-3">
                                        <label className={styles.holoLabel}>
                                            Full Name
                                        </label>
                                        <input
                                            className={styles.holoInput}
                                            name="name"
                                            type="text"
                                            placeholder="John Doe"
                                            onChange={handleSignUpChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className={styles.holoLabel}>
                                            Username
                                        </label>
                                        <input
                                            className={styles.holoInput}
                                            name="username"
                                            type="text"
                                            placeholder="johndoe123"
                                            onChange={handleSignUpChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className={styles.holoLabel}>
                                            Email
                                        </label>
                                        <input
                                            className={styles.holoInput}
                                            name="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            onChange={handleSignUpChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className={styles.holoLabel}>
                                            Password
                                        </label>
                                        <input
                                            className={styles.holoInput}
                                            name="password"
                                            type="password"
                                            placeholder="Create a password"
                                            onChange={handleSignUpChange}
                                            required
                                        />
                                    </div>
                                    {authMessage && (
                                        <div
                                            className={
                                                isError
                                                    ? styles.msgError
                                                    : styles.msgSuccess
                                            }
                                        >
                                            {authMessage}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className={styles.btnNeon}
                                        disabled={authState.isLoading}
                                    >
                                        {authState.isLoading ? (
                                            <Loader variant="inline" label="Creating account..." />
                                        ) : (
                                            "Sign Up"
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* --- FORGOT FORM --- */}
                            {viewState === "forgot" && (
                                <form onSubmit={handleForgotSubmit}>
                                    <div className="mb-4">
                                        <label className={styles.holoLabel}>
                                            Registered Email
                                        </label>
                                        <input
                                            className={styles.holoInput}
                                            value={forgotEmail}
                                            onChange={(e) =>
                                                setForgotEmail(e.target.value)
                                            }
                                            type="email"
                                            placeholder="name@example.com"
                                            required
                                        />
                                    </div>
                                    {authMessage && (
                                        <div
                                            className={
                                                isError
                                                    ? styles.msgError
                                                    : styles.msgSuccess
                                            }
                                        >
                                            {authMessage}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className={styles.btnNeon}
                                    >
                                        Send Reset Link
                                    </button>
                                    <div className="text-center mt-3">
                                        <span
                                            className={styles.linkAction}
                                            onClick={() =>
                                                setViewState("login")
                                            }
                                        >
                                            Return to Login
                                        </span>
                                    </div>
                                </form>
                            )}

                            <div className={styles.formFooter}>
                                {viewState === "login" && (
                                    <p>
                                        Don't have an account?{" "}
                                        <span
                                            className={styles.linkHighlight}
                                            onClick={() =>
                                                setViewState("register")
                                            }
                                        >
                                            Sign Up
                                        </span>
                                    </p>
                                )}
                                {viewState === "register" && (
                                    <p>
                                        Already have an account?{" "}
                                        <span
                                            className={styles.linkHighlight}
                                            onClick={() =>
                                                setViewState("login")
                                            }
                                        >
                                            Login
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
