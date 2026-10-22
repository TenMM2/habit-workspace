import { useEffect, useMemo, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { daysCol } from '../lib/db';
import type { DayEntry, HabitPage } from '../types';
import type { DaysByPage } from '../lib/stats';

function aEntry(fecha: string, x: Record<string, unknown>): DayEntry {
  return {
    date: fecha,
    note: typeof x.note === 'string' ? x.note : '',
    checks: (x.checks as Record<string, boolean> | undefined) ?? {},
  };
}

/** Días de UNA página entre dos fechas (ambas incluidas), en tiempo real. */
export function useDays(uid: string, pageId: string, desde: string, hasta: string): Record<string, DayEntry> {
  const [days, setDays] = useState<Record<string, DayEntry>>({});

  useEffect(() => {
    setDays({});
    return onSnapshot(
      query(daysCol(uid, pageId), where('date', '>=', desde), where('date', '<=', hasta)),
      (snap) => {
        const out: Record<string, DayEntry> = {};
        snap.forEach((d) => {
          out[d.id] = aEntry(d.id, d.data());
        });
        setDays(out);
      },
      (e) => console.error(e)
    );
  }, [uid, pageId, desde, hasta]);

  return days;
}

/** Días de TODAS las páginas entre dos fechas, en tiempo real (dashboard y calendario). */
export function useAllDays(uid: string, pages: HabitPage[], desde: string, hasta: string): DaysByPage {
  const [data, setData] = useState<DaysByPage>({});
  const clave = useMemo(() => pages.map((p) => p.id).join(','), [pages]);

  useEffect(() => {
    const ids = clave ? clave.split(',') : [];
    setData({});
    const offs = ids.map((id) =>
      onSnapshot(
        query(daysCol(uid, id), where('date', '>=', desde), where('date', '<=', hasta)),
        (snap) => {
          const out: Record<string, DayEntry> = {};
          snap.forEach((d) => {
            out[d.id] = aEntry(d.id, d.data());
          });
          setData((prev) => ({ ...prev, [id]: out }));
        },
        (e) => console.error(e)
      )
    );
    return () => offs.forEach((off) => off());
  }, [uid, clave, desde, hasta]);

  return data;
}
