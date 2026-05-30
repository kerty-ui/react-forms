import { useRef } from "react";

export const useRenderCount = () => {
    const count = useRef<number>(0);
    count.current = count.current + 1;
    return "RC: " + count.current;
}

export const RenderCount = () => 
    <span className="render-count text-sm text-gray-400">{useRenderCount()}</span>;
