import { Link } from "react-router-dom";
import { Icon } from "./icon";
import styles from "./breadcrumb.module.css";

export interface BreadcrumbItem { to: string; label: string }

/**
 * The site's one breadcrumb: Home (icon), the parent pages as links, then the current page
 * (aria-current="page", not a link). Long trails scroll inside the bar instead of widening the page;
 * the separators point the reading direction, so they flip in Arabic.
 */
export function Breadcrumb({ homeLabel, label, items, current }: { homeLabel: string; label: string; items: readonly BreadcrumbItem[]; current: string }) {
  return (
    <nav aria-label={label} className={styles.breadcrumb} data-breadcrumb>
      <ol className={styles.list}>
        <li className={styles.item}>
          <Link to="/" className={styles.link}><Icon name="home" className={styles.home} aria-hidden="true" /><span>{homeLabel}</span></Link>
        </li>
        {items.map((item) => (
          <li key={`${item.to}-${item.label}`} className={styles.item}>
            <Icon name="chevronEnd" className={styles.separator} aria-hidden="true" />
            <Link to={item.to} className={styles.link}><bdi>{item.label}</bdi></Link>
          </li>
        ))}
        <li className={styles.item}>
          <Icon name="chevronEnd" className={styles.separator} aria-hidden="true" />
          <span aria-current="page" className={styles.current} title={current}><bdi>{current}</bdi></span>
        </li>
      </ol>
    </nav>
  );
}
