import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "../hotels.module.css";

export function SectionHeading({
  icon,
  title,
  children,
}: {
  icon: "bed" | "pin";
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.sectionIcon}>
        <Icon name={icon} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}
