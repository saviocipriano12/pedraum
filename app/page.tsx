"use client";
import Hero from "@/components/Hero";
import FeaturesSection from "@/components/FeaturesSection";
import MachinesShowcase from "@/components/MachinesShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import DemandasShowcase from "@/components/DemandasShowcase";
import SectionTransition from "@/components/SectionTransition";
import NewsletterSection from "@/components/NewsletterSection";
import BlogShowcase from "@/components/BlogShowcase";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import Footer from "@/components/Footer";

// Tipos...
interface Machine {
  id: string;
  nome: string;
  preco: string;
  imagens: string[];
  promovida?: boolean;
}
interface Demanda {
  id: string;
  categoria: string;
  descricao: string;
}

export default function HomePage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [demandas, setDemandas] = useState<Demanda[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const machinesQuery = query(
          collection(db, "machines"),
          orderBy("createdAt", "desc"),
          limit(8)
        );
        const demandasQuery = query(
          collection(db, "demandas"),
          orderBy("createdAt", "desc"),
          limit(6)
        );
        const [machinesSnapshot, demandasSnapshot] = await Promise.all([
          getDocs(machinesQuery),
          getDocs(demandasQuery),
        ]);
        setMachines(machinesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Machine[]);
        setDemandas(demandasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Demanda[]);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8f0ff] via-[#fdf7ee] to-[#e8eaff] font-inter">
      <Hero />
      <div className="mt-28">
        <FeaturesSection />
      </div>
      <div className="mt-28">
        <MachinesShowcase />
      </div>
      <div className="mt-28">
        <BlogShowcase />
      </div>
      <div className="mt-28">
        <SectionTransition />
      </div>
      <div className="mt-28">
        <DemandasShowcase />
      </div>
      <NewsletterSection />
     <div className="mt-28">
        <TestimonialsSection />
      </div>             
    </main>
  );
}
