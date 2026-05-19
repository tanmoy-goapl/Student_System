interface RemarkBadgeProps {
  remark: string;
  styles: {
    badge: string;
  };
}

export default function RemarkBadge({
  remark,
  styles,
}: RemarkBadgeProps) {
  return (
    <span
      className={`
        text-[0.4rem]
        px-1.5 py-[1px]
        rounded-md
        uppercase
        font-semibold
        ${styles.badge}
      `}
    >
      {remark}
    </span>
  );
}