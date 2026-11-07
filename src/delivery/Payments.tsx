import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  checkMobilePayment,
  chooseCash,
  paymentAvailability,
  startMobilePayment,
  ugx,
  type PaymentFields,
  type PaymentMethod,
  type Tracking,
} from "./api";
import "./payments.css";

export function CheckoutPaymentChoice({
  value,
  onChange,
  disabled,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="checkout-payment-choice" disabled={disabled}>
      <legend>How would you like to pay?</legend>
      <label className={value === "cash" ? "chosen" : ""}>
        <input
          type="radio"
          name="payment_method"
          value="cash"
          checked={value === "cash"}
          onChange={() => onChange("cash")}
        />
        <span className="method-icon">
          <Banknote size={21} />
        </span>
        <span>
          <strong>Cash on delivery</strong>
          <small>Pay the rider when your food arrives.</small>
        </span>
      </label>
      <label className={value === "mobile_money" ? "chosen" : ""}>
        <input
          type="radio"
          name="payment_method"
          value="mobile_money"
          checked={value === "mobile_money"}
          onChange={() => onChange("mobile_money")}
        />
        <span className="method-icon momo">
          <Smartphone size={21} />
        </span>
        <span>
          <strong>Mobile Money</strong>
          <small>MTN MoMo or Airtel Money · via DGateway</small>
        </span>
        <span className="secure-chip">
          <LockKeyhole size={9} />
          SECURE
        </span>
      </label>
      {value === "mobile_money" && (
        <p>
          Your order is saved first. On the next screen, request a payment
          prompt and approve it on your phone. We never ask for your Mobile
          Money PIN.
        </p>
      )}
    </fieldset>
  );
}

export function PaymentBadge({
  payment_method = "cash",
  payment_status = "unpaid",
  payment_review_required,
}: PaymentFields) {
  return (
    <span className={`payment-badge ${payment_status} ${payment_method}`}>
      <span>
        {payment_method === "mobile_money" ? (
          <Smartphone size={11} />
        ) : (
          <Banknote size={11} />
        )}
      </span>
      {payment_status === "paid"
        ? "Paid · Mobile Money"
        : payment_method === "cash"
          ? "Cash on delivery"
          : payment_status === "pending"
            ? "Mobile Money · pending"
            : payment_status === "failed"
              ? "Mobile Money · failed"
              : "Mobile Money · not paid"}
      {payment_review_required && <strong>Review needed</strong>}
    </span>
  );
}

export function PaymentPanel({
  order,
  token,
  initialPhone = "",
  onUpdate,
}: {
  order: Tracking;
  token: string;
  initialPhone?: string;
  onUpdate: (next: Tracking) => void;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [showForm, setShowForm] = useState(
    order.payment_method === "mobile_money",
  );
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const paid = order.payment_status === "paid";
  const unresolved =
    !!order.payment &&
    ["initiating", "pending", "unknown"].includes(order.payment.status);
  const closed = ["cancelled", "delivered"].includes(order.status);
  useEffect(() => {
    if (!showForm || paid || unresolved || closed) return;
    let active = true;
    setAvailable(null);
    void paymentAvailability()
      .then((ok) => {
        if (active) setAvailable(ok);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, [showForm, paid, unresolved, closed]);
  useEffect(() => {
    if (!unresolved || paid) return;
    let active = true;
    async function verify() {
      if (document.hidden || lock.current) return;
      lock.current = true;
      try {
        const next = await checkMobilePayment(order.id, token);
        if (active) {
          onUpdate(next);
          setError("");
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Payment verification unavailable. Keep the existing order reference.",
          );
      } finally {
        lock.current = false;
      }
    }
    void verify();
    const timer = setInterval(verify, 12000);
    document.addEventListener("visibilitychange", verify);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", verify);
    };
  }, [order.id, order.payment?.id, unresolved, paid, token, onUpdate]);
  async function act(task: () => Promise<Tracking>, notice: string) {
    if (lock.current) {
      setMessage("A payment check is already running. Please wait.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await task();
      onUpdate(next);
      setMessage(notice);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Payment could not be confirmed. Do not pay again yet.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className={`customer-payment ${paid ? "is-paid" : ""}`}
      aria-label="Order payment"
    >
      <div className="customer-payment-heading">
        <span className="customer-payment-icon">
          {paid ? <CheckCircle2 size={23} /> : <Smartphone size={23} />}
        </span>
        <div>
          <small>YOUR PAYMENT</small>
          <h3>
            {paid
              ? "Payment verified. Thank you!"
              : unresolved
                ? "Waiting for payment confirmation"
                : order.payment_status === "failed"
                  ? "The payment did not complete"
                  : "Good food. Easy payment."}
          </h3>
        </div>
      </div>
      <PaymentBadge {...order} />
      {paid ? (
        <>
          <p className="payment-success-note">
            <ShieldCheck size={16} />
            {ugx(order.total)} confirmed by DGateway. Please do not pay the
            rider again.
          </p>
          {order.payment_review_required && (
            <p className="payment-warning">
              This payment needs restaurant review, for example after a
              cancellation or duplicate settlement. A refund is not automatic.
            </p>
          )}
        </>
      ) : unresolved ? (
        <>
          <div className="phone-prompt-illustration">
            <span>
              <Smartphone size={31} />
              <i>
                <Clock3 size={13} />
              </i>
            </span>
            <div>
              <strong>Check your payer phone</strong>
              <p>
                Approve the network’s Mobile Money prompt. If money has left
                your wallet, don’t pay again—even if verification is delayed.
              </p>
            </div>
          </div>
          <p className="payment-warning">
            A pending or unknown request is not a failed payment. Do not start
            another order or switch to cash to retry. Confirmation checks run
            every 12 seconds while this page is visible.
          </p>
          <button
            className="dispatch-outline full-width"
            disabled={busy}
            onClick={() =>
              void act(
                () => checkMobilePayment(order.id, token),
                "Payment status checked.",
              )
            }
          >
            <RefreshCw size={15} />
            Check payment status
          </button>
          {!order.payment?.reference && !closed && (
            <button
              className="resume-payment"
              disabled={busy}
              onClick={() =>
                void act(
                  () => startMobilePayment(order.id, token, ""),
                  "The same payment request was resumed. No new attempt was created.",
                )
              }
            >
              Resume the same request safely <ArrowRight size={13} />
            </button>
          )}
        </>
      ) : closed ? (
        <p className="payment-warning">
          This order is closed. No new payment can be requested.
        </p>
      ) : showForm || order.payment_method === "mobile_money" ? (
        <>
          {order.payment_status === "failed" && (
            <p className="payment-warning">
              The gateway reports this attempt failed. If your wallet was
              debited, contact the restaurant before trying again. A new prompt
              is requested only when you press the button.
            </p>
          )}
          <p className="payment-intro">
            Pay <strong>{ugx(order.total)}</strong> securely through DGateway
            using MTN MoMo or Airtel Money.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                () => startMobilePayment(order.id, token, phone),
                "Payment requested. Approve the prompt on your phone.",
              );
            }}
          >
            <label className="field">
              Mobile Money payer number
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0772 123 456 or +256 772 123 456"
                pattern="(0|\+?256)7[0-9\s]{8,13}"
                disabled={busy}
                maxLength={20}
              />
            </label>
            <p className="pin-safety">
              <LockKeyhole size={13} />
              Enter your PIN only in the secure network prompt on your phone.
              Never enter it on this website.
            </p>
            <button
              className="primary full-width"
              disabled={busy || available !== true}
              type="submit"
            >
              <Smartphone size={17} />
              {busy
                ? "Requesting payment…"
                : available === null
                  ? "Checking payment availability…"
                  : `Send payment prompt · ${ugx(order.total)}`}
            </button>
            {available === false && (
              <p className="payment-warning" role="status">
                Mobile Money is unavailable right now. No payment has been
                requested. You can choose cash or try again later.
              </p>
            )}
          </form>
          <button
            className="cash-fallback"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const next = await chooseCash(order.id, token);
                setShowForm(false);
                return next;
              }, "Cash on delivery selected. No online payment was requested.")
            }
          >
            <Banknote size={15} />
            Choose cash on delivery instead
          </button>
        </>
      ) : (
        <>
          <p className="payment-intro">
            You chose cash on delivery. You can also pay securely with Mobile
            Money before your food arrives.
          </p>
          <button
            className="dispatch-outline full-width"
            disabled={busy}
            onClick={() => setShowForm(true)}
          >
            <Smartphone size={15} />
            Pay with Mobile Money instead <ArrowRight size={14} />
          </button>
        </>
      )}
      {order.payment?.reference && (
        <div className="payment-reference">
          <span>DGateway reference</span>
          <code>{order.payment.reference}</code>
          {order.payment.verified_at && (
            <small>
              Last verified{" "}
              {new Date(order.payment.verified_at).toLocaleString("en-UG", {
                timeZone: "Africa/Kampala",
              })}{" "}
              EAT
            </small>
          )}
        </div>
      )}
      {error && (
        <p className="payment-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="payment-message" role="status">
          {message}
        </p>
      )}
      <div className="powered-by">
        <ShieldCheck size={12} />
        Payments by <strong>DGateway</strong>
        <span>UGX · Secure server verification</span>
      </div>
    </section>
  );
}
