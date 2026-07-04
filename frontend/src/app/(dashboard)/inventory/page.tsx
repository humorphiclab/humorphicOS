"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { inventoryApi } from "@/lib/api";
import { AlertTriangle, Package } from "lucide-react";

export default function InventoryPage() {
  const { data: components } = useQuery({ queryKey: ["components"], queryFn: inventoryApi.components });
  const { data: lowStock } = useQuery({ queryKey: ["low-stock"], queryFn: inventoryApi.lowStock });
  const { data: equipment } = useQuery({ queryKey: ["equipment"], queryFn: inventoryApi.equipment });

  return (
    <>
      <TopBar title="Robotics Inventory" />
      <div className="p-6 space-y-6">
        {lowStock && lowStock.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm">{lowStock.length} component(s) are low on stock.</p>
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> Components</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(components ?? []).map((c) => (
              <Card key={c.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.sku} · {c.category}</p>
                  </div>
                  <span className={`text-sm font-bold ${c.quantity <= c.min_stock ? "text-warning" : "text-success"}`}>
                    {c.quantity}
                  </span>
                </div>
                <p className="text-xs text-muted mt-2">{c.location}</p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Equipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(equipment ?? []).map((e) => (
              <Card key={e.id} className="flex justify-between">
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-muted">{e.serial_number}</p>
                </div>
                <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-primary/15 text-primary">{e.status}</span>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
