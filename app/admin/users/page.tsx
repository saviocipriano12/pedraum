// =============================
// app/admin/users/page.tsx
// =============================

"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useEffect, useState } from "react";
import { mockUsers } from "@/mocks/mockUsers";
import ProfileCard from "@/components/ProfileCard";

export default function AdminUsersPage() {
  const [users, setUsers] = useState(mockUsers);

  useEffect(() => {
    setUsers(mockUsers); // Em breve trocar por dados reais do Firestore
  }, []);

  return (
    <LayoutWithSidebar>
      <h1>Usuários Registrados</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <ProfileCard
            key={user.id}
            nome={user.nome}
            email={user.email}
            tipo={user.tipo}
            imagem={user.imagem}
          />
        ))}
      </div>
    </LayoutWithSidebar>
  );
}
