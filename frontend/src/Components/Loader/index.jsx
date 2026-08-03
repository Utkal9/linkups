// frontend/src/Components/Loader/index.jsx
import styles from "./styles.module.css";

/**
 * Branded Loader — LinkUps design system
 *
 * variant="page"    — Full-screen overlay (route transitions, initial load)
 * variant="section" — Centered inside a page section (data fetching)
 * variant="inline"  — Inside a button during form submission
 *
 * @param {string}  variant  "page" | "section" | "inline"
 * @param {string}  label    Optional text beneath/beside the spinner
 * @param {boolean} showLogo Show the LinkUps wordmark (page variant only)
 * @param {boolean} neutral  Use indigo spinner instead of white (for non-button inline use)
 */
export default function Loader({
    variant = "page",
    label,
    showLogo = true,
    neutral = false,
}) {
    if (variant === "inline") {
        return (
            <span className={styles.inlineWrapper}>
                <span
                    className={`${styles.spinner} ${neutral ? styles.spinnerInlineNeutral : styles.spinnerInline}`}
                    aria-hidden="true"
                />
                {label && <span>{label}</span>}
            </span>
        );
    }

    if (variant === "section") {
        return (
            <div className={styles.sectionWrapper} role="status" aria-label={label || "Loading"}>
                <div className={`${styles.spinner} ${styles.spinnerSection}`} />
                {label && <p className={styles.label}>{label}</p>}
            </div>
        );
    }

    // Default: page
    return (
        <div className={styles.pageOverlay} role="status" aria-label="Loading page">
            {showLogo && (
                <div className={styles.logoMark}>
                    <span>Link</span>Ups
                </div>
            )}
            <div className={`${styles.spinner} ${styles.spinnerPage}`} />
            {label && <p className={styles.label}>{label}</p>}
        </div>
    );
}
