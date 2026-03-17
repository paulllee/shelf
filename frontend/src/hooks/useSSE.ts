import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource("/events");

    es.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string);
      if (data.type === "invalidate") {
        for (const key of data.keys as string[]) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
    };

    return () => es.close();
  }, [queryClient]);
}
