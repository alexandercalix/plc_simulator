"use client";
import cx from "classnames";
export default function StatusPill({ status }: { status: "connected" | "disconnected" | "unknown" }) {
    return (
        <span className={cx("badge", {
            "badge-connected": status === "connected",
            "badge-disconnected": status === "disconnected",
            "badge-unknown": status === "unknown",
        })}>
            {status}
        </span>
    );
}