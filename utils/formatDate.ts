// =============================
// 📁 Arquivo: utils/formatDate.ts
// =============================

export function formatDate(date: Date | string) {
    const data = typeof date === "string" ? new Date(date) : date;
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  