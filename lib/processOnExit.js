
/**
 * Handle the different ways an application can shutdown
 */
module.exports = function onExit(cb) {
  process.on(
    "exit",
    cb.bind(null, {
      event: "exit",
      cleanup: true
    })
  );
  process.on(
    "SIGINT",
    cb.bind(null, {
      event: "SIGINT",
      exit: true
    })
  );
  process.on(
    "uncaughtException",
    cb.bind(null, {
      event: "uncaughtException",
      exit: true
    })
  );
}

