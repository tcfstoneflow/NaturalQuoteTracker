import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Pencil, Trash2, Search, Filter, ExternalLink, Settings, X, Upload, Sparkles, Palette, ArrowUpDown, ArrowUp, ArrowDown, Wand2, Copy, Download } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import TopBar from "@/components/layout/topbar";
import { ImageUpload } from "@/components/ui/image-upload";
import Papa from "papaparse";          // ← NEW

/* ---------- (all interfaces / constants unchanged) ---------- */

export default function Inventory() {
  /* ---------- state & hooks unchanged ---------- */

  /* ---------- query & mutation hooks unchanged ---------- */

  /* ---------- CSV EXPORT logic unchanged ---------- */

  /* ----- CSV  IMPORT  (updated section starts here) ----- */
  const handleCsvFile = async (file: File, clearInput: () => void) => {
    try {
      toast({ title: "Importing…", description: "Processing your CSV file." });

      const csvText = await file.text();

      // Parse CSV with Papa
      const { data: rows, errors } = Papa.parse<Record<string, any>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim().replace(/"/g, ""),
        dynamicTyping: true
      });

      if (errors.length) {
        throw new Error(`CSV parse error: ${errors[0].message}`);
      }
      if (!rows.length) throw new Error("CSV contained no data rows");

      // Validate headers match expected
      const expectedHeaders = [
        "id", "bundleId", "name", "description", "supplier", "category",
        "grade", "thickness", "finish", "price", "unit", "stockQuantity",
        "slabLength", "slabWidth", "location", "imageUrl", "barcodes"
      ];
      const headers = Object.keys(rows[0]);
      if (headers.length !== expectedHeaders.length ||
          !expectedHeaders.every((h, i) => h === headers[i])) {
        throw new Error("CSV header mismatch – please export, edit, and re-import.");
      }

      let success = 0, fail = 0;

      for (const row of rows) {
        if (!row.id) { fail++; continue; }

        // Sanitise numeric fields
        ["price", "stockQuantity", "slabLength", "slabWidth"].forEach(f => {
          if (row[f] === "") row[f] = null;
        });

        try {
          const res = await fetch(`/api/products/${row.id}`, {
            method: "PATCH",                 // ← PATCH not PUT
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(row)
          });

          if (res.ok) success++; else fail++;
        } catch {
          fail++;
        }

        // tiny pause to avoid server flood
        await new Promise(r => setTimeout(r, 60));
      }

      toast({
        title: "Import complete",
        description: `Updated ${success} bundle${success !== 1 ? "s" : ""}${fail ? `, ${fail} failed` : ""}.`
      });

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsBulkOpen(false);
    } catch (err: any) {
      toast({
        title: "Import error",
        description: err.message ?? "Failed to import CSV.",
        variant: "destructive"
      });
    } finally {
      clearInput();
    }
  };
  /* ----- CSV  IMPORT  (updated section ends here) ----- */

  /* ---------- JSX & remaining component code unchanged, but  ----------
     inside the <input type="file"> onChange we now call handleCsvFile  */

  return (
    /* …the JSX tree…
       (only change: replace old onChange handler with the one below) */

    <input
      type="file"
      accept=".csv"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const expectedPattern = /^inventory_bundles_\d{4}-\d{2}-\d{2}\.csv$/;
        if (!expectedPattern.test(file.name)) {
          toast({
            title: "Invalid file",
            description: "Please import a CSV exported from this system.",
            variant: "destructive"
          });
          e.target.value = "";
          return;
        }
        handleCsvFile(file, () => { e.target.value = ""; });
      }}
      className="hidden"
      id="csv-upload"
    />

    /* …rest of file unchanged… */
  );
}