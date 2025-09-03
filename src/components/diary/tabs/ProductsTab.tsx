"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductEditor } from "@/components/products/ProductEditor";
import { toast } from "@/components/ui/use-toast";

type Product = {
  id?: string;
  diaryId?: string;
  upc?: string | null;
  name: string;
  qty: number;
  unitPrice: number | string;
  lineTotal?: number | string;
};

interface ProductsTabProps {
  diaryId: string;
  products: Product[];
}

export function ProductsTab({ diaryId, products }: ProductsTabProps) {
  const queryClient = useQueryClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorRows, setEditorRows] = useState<Product[]>(products ?? []);
  const draftKey = useMemo(
    () => ["diary-products-draft", diaryId] as const,
    [diaryId]
  );
  const latestRowsRef = useRef<Product[]>(editorRows);

  // When switching to a different diary, reset editor rows from server data
  useEffect(() => {
    const draft = queryClient.getQueryData<Product[]>(draftKey);
    if (draft && draft.length >= 0) {
      if (draft !== latestRowsRef.current) setEditorRows(draft);
    } else {
      if ((products ?? []) !== latestRowsRef.current)
        setEditorRows(products ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryId, products, draftKey]);

  // Track latest rows in a ref for unmount flush
  useEffect(() => {
    latestRowsRef.current = editorRows;
  }, [editorRows]);

  function normalizeProducts(productList: Product[]) {
    return productList
      .map((p) => {
        const name = (p.name ?? "").trim();
        const qtyNumber = Number(p.qty);
        const unitPriceNumber = Number(p.unitPrice);
        const qty = Number.isFinite(qtyNumber)
          ? Math.max(1, Math.floor(qtyNumber))
          : 1;
        const unitPrice = Number.isFinite(unitPriceNumber)
          ? Math.max(0, unitPriceNumber)
          : 0;
        const upc = p.upc ?? undefined;
        return { id: p.id, upc, name, qty, unitPrice };
      })
      .filter((p) => p.name.length > 0);
  }

  const updateProductsMutation = useMutation({
    mutationKey: ["diary-products", diaryId],
    mutationFn: async (productList: Product[]) => {
      const response = await fetch(`/api/diaries/${diaryId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productList),
      });

      if (!response.ok) {
        throw new Error("Failed to update products");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Products saved", duration: 3000 });
      // Invalidate the diary query to refresh all data
      queryClient.invalidateQueries({ queryKey: ["diary", diaryId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to save products",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
        duration: 15000,
      });
    },
  });

  const handleProductsChange = (productList: Product[]) => {
    setEditorRows(productList);
    // Persist draft so rows survive tab switches and reloads
    queryClient.setQueryData(draftKey, productList);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const cleaned = normalizeProducts(productList);
      updateProductsMutation.mutate(cleaned);
    }, 800);
  };

  // Flush pending save on unmount only to avoid loops
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        const cleaned = normalizeProducts(latestRowsRef.current);
        updateProductsMutation.mutate(cleaned);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <ProductEditor
        value={editorRows}
        onChange={handleProductsChange}
        disabled={updateProductsMutation.isPending}
      />

      {/* Saving indicator moved to global bottom bar */}
    </div>
  );
}
