import { useEffect, useMemo, useState } from 'react';
import { backend } from '../backend';
import type { DayEntry, HabitPage } from '../types';
import type { DaysByPage } from '../lib/stats';

/** Días de UNA página entre dos fechas (ambas incluidas), en tiempo real. */
export function useDays(uid: string, pageId: string, desde: string, hasta: string): Record<string, DayEntry> {
  const [days, setDays] = useState<Record<string, DayEntry>>({});

  useEffect(() => {
    setDays({});
    return backend.days.subscribe(uid, pageId, desde, hasta, setDays, (e) => console.error(e));
  }, [uid, pageId, desde, hasta]);

  return days;
}

/** Días de TODAS las páginas entre dos fechas, en tiempo real (dashboard, calendario y asistente). */
export function useAllDays(uid: string, pages: HabitPage[], desde: string, hasta: string, activo = true): DaysByPage {
  const [data, setData] = useState<DaysByPage>({});
  const clave = useMemo(() => pages.map((p) => p.id).join(','), [pages]);

  useEffect(() => {
    const ids = clave && activo ? clave.split(',') : [];
    setData({});
    const offs = ids.map((id) =>
      backend.days.subscribe(
        uid,
        id,
        desde,
        hasta,
        (dias) => setData((prev) => ({ ...prev, [id]: dias })),
        (e) => console.error(e)
      )
    );
    return () => offs.forEach((off) => off());
  }, [uid, clave, desde, hasta, activo]);

  return data;
}
