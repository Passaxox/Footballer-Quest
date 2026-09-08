import { itemPresentation } from "@/game/data";
import { sfx } from "@/game/audio";
import { Btn, Header, Panel, ItemInfo } from "./ui";
import { Coins } from "lucide-react";

export default function ShopScreen({ run, stock, onBuy, onLeave }) {
  const bought = run.pending.bought || [];
  return (
    <div data-testid="shop-screen" className="flex flex-col flex-1">
      <Header title="Mercante Raijin" sub="«Solo roba di qualità, garantito!»" right={<div className="flex items-center gap-1 font-pixel text-[9px] text-amber-300" data-testid="shop-money"><Coins size={12} /> {run.money}</div>} />
      <div className="p-3 space-y-2 flex-1">
        <Panel className="font-body text-lg text-slate-200 leading-tight">Un venditore ambulante ha allestito un banchetto a bordo campo. Ogni oggetto può essere comprato una sola volta.</Panel>
        {stock.map((s, i) => {
          const done = bought.includes(i);
          const can = run.money >= s.price && !done;
          return (
            <div key={i} className={`flex items-center gap-2 p-2 border-2 ${itemPresentation(s.id).cardClass} ${done ? "opacity-50" : ""}`}>
              <div className="flex-1">
                <ItemInfo id={s.id} />
              </div>
              <Btn data-testid={`buy-item-${i}`} variant={can ? "primary" : "default"} disabled={!can} className="min-w-[72px]" onClick={() => { sfx.confirm(); onBuy(i); }}>
                {done ? "OK" : `${s.price} P`}
              </Btn>
            </div>
          );
        })}
      </div>
      <div className="p-3"><Btn data-testid="shop-leave-btn" className="w-full" onClick={() => { sfx.cancel(); onLeave(); }}>Lascia il mercante</Btn></div>
    </div>
  );
}
