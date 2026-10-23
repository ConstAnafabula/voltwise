(function () {
  "use strict";

  var DISCOUNT_RATE = 0.10;
  var DISCOUNT_CAP = 500;

  var form = document.getElementById("billForm");
  var errorBox = document.getElementById("errorBox");
  var resetBtn = document.getElementById("resetBtn");
  var emptyState = document.getElementById("emptyState");
  var results = document.getElementById("results");

  var ids = ["consumerName", "provider", "prevReading", "currReading", "rate", "otherCharges", "prevBalance", "payment"];
  var el = {};
  ids.forEach(function (id) { el[id] = document.getElementById(id); });

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function peso(n) {
    return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function num(id) {
    var v = el[id].value.trim();
    return v === "" ? NaN : Number(v);
  }

  function showError(message, fields) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    (fields || []).forEach(function (id) { el[id].classList.add("invalid"); });
  }

  function clearErrors() {
    errorBox.hidden = true;
    errorBox.textContent = "";
    ids.forEach(function (id) { el[id].classList.remove("invalid"); });
  }

  function getStatus(total, payment) {
    if (total === 0 && payment === 0) return { label: "No Amount Due", css: "none" };
    if (payment > total) return { label: "Payment Credit", css: "credit" };
    if (payment === total) return { label: "Fully Paid", css: "full" };
    if (payment === 0) return { label: "Unpaid", css: "unpaid" };
    return { label: "Partially Paid", css: "partial" };
  }

  function validate() {
    var name = el.consumerName.value.trim();
    var provider = el.provider.value.trim();
    var bad = [];

    if (!name) bad.push("consumerName");
    if (!provider) bad.push("provider");
    if (bad.length) {
      showError("Please enter the consumer's name and electricity provider.", bad);
      return null;
    }

    var numeric = ["prevReading", "currReading", "rate", "otherCharges", "prevBalance", "payment"];
    numeric.forEach(function (id) {
      var v = num(id);
      if (isNaN(v) || v < 0) bad.push(id);
    });
    if (bad.length) {
      showError("Please fill in every numeric field with a number that is zero or greater.", bad);
      return null;
    }

    if (num("currReading") < num("prevReading")) {
      showError("Current meter reading cannot be lower than the previous meter reading.", ["currReading", "prevReading"]);
      return null;
    }

    return {
      name: name,
      provider: provider,
      prev: num("prevReading"),
      curr: num("currReading"),
      rate: num("rate"),
      other: num("otherCharges"),
      prevBalance: num("prevBalance"),
      payment: num("payment"),
      eligible: form.elements.eligibility.value === "Eligible"
    };
  }

  function compute(d) {
    var consumption = d.curr - d.prev;                       // 1
    var charge = round2(consumption * d.rate);               // 2
    var discount = 0;                                        // 3-4
    if (d.eligible) {
      discount = Math.min(round2(charge * DISCOUNT_RATE), DISCOUNT_CAP);
    }
    var currentBill = round2(charge - discount + d.other);   // 5
    var total = round2(currentBill + d.prevBalance);         // 6
    var payment = round2(d.payment);
    var status = getStatus(total, payment);                  // 7
    var diff = round2(total - payment);                      // 8

    return {
      consumption: consumption,
      charge: charge,
      discount: discount,
      other: round2(d.other),
      currentBill: currentBill,
      prevBalance: round2(d.prevBalance),
      total: total,
      payment: payment,
      status: status,
      balanceLabel: diff < 0 ? "Excess Payment (Credit)" : "Unpaid Balance",
      balance: Math.abs(diff)
    };
  }

  function render(d, r) {
    document.getElementById("outName").textContent = d.name;
    document.getElementById("outProvider").textContent = d.provider;
    document.getElementById("outConsumption").textContent =
      (Math.round(r.consumption * 100) / 100).toLocaleString("en-PH") + " kWh";
    document.getElementById("outCharge").textContent = peso(r.charge);
    document.getElementById("outDiscount").textContent = (r.discount > 0 ? "- " : "") + peso(r.discount);
    document.getElementById("outOther").textContent = peso(r.other);
    document.getElementById("outCurrentBill").textContent = peso(r.currentBill);
    document.getElementById("outPrev").textContent = peso(r.prevBalance);
    document.getElementById("outTotal").textContent = peso(r.total);
    document.getElementById("outPayment").textContent = peso(r.payment);
    document.getElementById("outBalanceLabel").textContent = r.balanceLabel;
    document.getElementById("outBalance").textContent = peso(r.balance);

    var badge = document.getElementById("outStatus");
    badge.textContent = r.status.label;
    badge.className = "badge " + r.status.css;

    emptyState.hidden = true;
    results.hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();
    var data = validate();
    if (!data) {
      results.hidden = true;
      emptyState.hidden = false;
      return;
    }
    render(data, compute(data));
  });

  resetBtn.addEventListener("click", function () {
    form.reset();
    clearErrors();
    results.hidden = true;
    emptyState.hidden = false;
  });

  ids.forEach(function (id) {
    el[id].addEventListener("input", function () { el[id].classList.remove("invalid"); });
  });

  // Exposed for quick console testing
  window.__compute = compute;
})();
