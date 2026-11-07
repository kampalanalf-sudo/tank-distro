import { useEffect, useState } from "react";
import App from "../App";
import { deliveryClient } from "./api";
import { Portal } from "./Portal";
import { CustomerTracking } from "./Tracking";
import "./delivery.css";

export default function Router() {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    const change = () => {
      setRoute(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    const {
      data: { subscription },
    } = deliveryClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && /access_token=|refresh_token=/.test(route)) {
        setTimeout(() => {
          const target = sessionStorage.getItem("cjc-after-auth") || "#admin";
          window.location.hash = target;
          setRoute(target);
        }, 0);
      }
    });
    return () => {
      window.removeEventListener("hashchange", change);
      subscription.unsubscribe();
    };
  }, []);
  if (/access_token=|refresh_token=/.test(route))
    return (
      <Portal
        mode={
          sessionStorage.getItem("cjc-after-auth") === "#rider"
            ? "rider"
            : "admin"
        }
      />
    );
  if (route === "#admin" || route === "#rider")
    return <Portal key={route} mode={route === "#admin" ? "admin" : "rider"} />;
  if (route === "#track") return <CustomerTracking />;
  return <App />;
}
