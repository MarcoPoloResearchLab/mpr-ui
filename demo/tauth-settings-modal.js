// @ts-check

(function () {
  "use strict";

  var MENU_ITEM_EVENT = "mpr-user:menu-item";
  var SETTINGS_ACTION = "open-settings";
  var modal = document.getElementById("demo-settings-modal");
  if (!modal) {
    return;
  }

  var closeTargets = Array.prototype.slice.call(
    modal.querySelectorAll("[data-demo-settings-close]"),
  );
  var isModalOpen = false;

  function applyModalState(nextState) {
    if (nextState) {
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      if (closeTargets.length && closeTargets[0].focus) {
        closeTargets[0].focus();
      }
      return;
    }
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("hidden", "hidden");
  }

  function setModalOpen(nextState) {
    var resolvedState = Boolean(nextState);
    if (resolvedState === isModalOpen) {
      return;
    }
    isModalOpen = resolvedState;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function applyState() {
        applyModalState(resolvedState);
      });
      return;
    }
    applyModalState(resolvedState);
  }

  function handleMenuItemEvent(eventObject) {
    var detail = eventObject && eventObject.detail ? eventObject.detail : null;
    if (!detail || detail.action !== SETTINGS_ACTION) {
      return;
    }
    setModalOpen(true);
  }

  function handleModalClick(eventObject) {
    var target = eventObject && eventObject.target ? eventObject.target : null;
    if (!target || typeof target.getAttribute !== "function") {
      return;
    }
    if (target.getAttribute("data-demo-settings-close") === null) {
      return;
    }
    if (eventObject && typeof eventObject.preventDefault === "function") {
      eventObject.preventDefault();
    }
    setModalOpen(false);
  }

  function handleKeyDown(eventObject) {
    if (!isModalOpen || !eventObject) {
      return;
    }
    var key = eventObject.key || eventObject.keyCode || "";
    if (key === "Escape" || key === "Esc" || key === 27) {
      setModalOpen(false);
    }
  }

  document.addEventListener(MENU_ITEM_EVENT, handleMenuItemEvent);
  modal.addEventListener("click", handleModalClick);
  document.addEventListener("keydown", handleKeyDown);
})();
