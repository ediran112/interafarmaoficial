import React from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * Aviso clínico permanente exibido em todas as telas, logo abaixo da navbar.
 * Escondido em impressão (o print stylesheet coloca o disclaimer no rodapé
 * do PDF para preservar espaço da consulta).
 */
export const ClinicalDisclaimer: React.FC = () => (
  <div className="print:hidden sticky top-14 sm:top-16 z-30 bg-amber-50 border-b border-amber-200">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-start gap-2">
      <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
      <p className="text-[11px] leading-snug text-amber-950">
        <span className="font-semibold">Aviso clínico.</span>{' '}
        <span className="hidden sm:inline">
          Ferramenta de apoio à decisão clínica com fins educacionais. Não substitui
          o julgamento clínico do profissional habilitado nem constitui dispositivo
          médico registrado. Toda decisão terapêutica deve considerar o quadro
          clínico completo do paciente.
        </span>
        <span className="sm:hidden">
          Apoio à decisão clínica educacional. Não substitui julgamento do profissional
          habilitado. Não é dispositivo médico registrado.
        </span>
      </p>
    </div>
  </div>
);
