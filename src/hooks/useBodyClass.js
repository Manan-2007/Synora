import { useLayoutEffect } from "react";

/* Puts classes on <body> while the component is mounted. The stylesheets
   key layouts to body classes (body.app, .app.nav-open, .ob). */
export default function useBodyClass(classNames) {
  useLayoutEffect(() => {
    const list = classNames.split(" ").filter(Boolean);
    document.body.classList.add(...list);
    return () => document.body.classList.remove(...list);
  }, [classNames]);
}
