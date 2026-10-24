import type { BudgetCategory } from "@/lib/domain/types";
import { formatMoney } from "@/lib/utils/format";

export function BudgetDonut({ categories, total }: { categories: BudgetCategory[]; total: number }) {
  const size = 210;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative mx-auto size-[210px]" role="img" aria-label={`Budget allocation chart. ${categories.map((item) => `${item.name}: ${formatMoney(item.planned)}`).join(". ")}`}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-soft)" strokeWidth={stroke} />
      {categories.map((category) => {
        const length = total > 0 ? category.planned / total * circumference : 0;
        const currentOffset = categories
          .slice(0, categories.indexOf(category))
          .reduce((sum, item) => sum + (total > 0 ? item.planned / total * circumference : 0), 0);
        return <circle key={category.id} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={category.color} strokeWidth={stroke} strokeDasharray={`${Math.max(0, length - 1.5)} ${circumference}`} strokeDashoffset={-currentOffset} className="transition-all duration-500" />;
      })}
    </svg>
    <div className="absolute inset-0 grid place-content-center text-center"><span className="text-[9px] font-bold tracking-[.16em] text-muted uppercase">planned</span><strong className="mt-1 font-display text-[28px] font-medium">{formatMoney(total)}</strong></div>
  </div>;
}
