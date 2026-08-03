import { store } from "@/config/redux/store.js";
import "@/styles/globals.css";
import { Provider } from "react-redux";
import Head from "next/head";
import { SocketProvider } from "@/context/SocketContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Loader from "@/Components/Loader";

function RouteLoader() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleStart = (url) => {
            // Don't show loader for same-page shallow navigations or hash changes
            if (url === router.asPath) return;
            setLoading(true);
        };
        const handleEnd = () => setLoading(false);
        const handleError = () => setLoading(false);

        router.events.on("routeChangeStart", handleStart);
        router.events.on("routeChangeComplete", handleEnd);
        router.events.on("routeChangeError", handleError);

        return () => {
            router.events.off("routeChangeStart", handleStart);
            router.events.off("routeChangeComplete", handleEnd);
            router.events.off("routeChangeError", handleError);
        };
    }, [router]);

    if (!loading) return null;
    return <Loader variant="page" showLogo={true} />;
}

export default function App({ Component, pageProps }) {
    const getLayout = Component.getLayout || ((page) => page);

    return (
        <>
            <Head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <title>LinkUps</title>
                <link
                    rel="icon"
                    href="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=1440,h=756,fit=crop,f=jpeg/A3Q7xGO4EOc9ZVJo/chatgpt-image-aug-11-2025-10_04_14-pm-YleQ8RV01OtW9GKv.png"
                    type="image/png"
                />
            </Head>
            <Provider store={store}>
                <ThemeProvider>
                    <SocketProvider>
                        <RouteLoader />
                        {getLayout(<Component {...pageProps} />)}
                    </SocketProvider>
                </ThemeProvider>
            </Provider>
        </>
    );
}
