/**
 * Emit a promise once in place of event with timeout
 * @param {EventEmitter} emitter
 */
function PromiseEmitter(emitter) {
  this.emitter = emitter;
}

PromiseEmitter.prototype.once = function once(event) {
  let timer;

  const promise = new Promise(resolve => {
    const emit = (...args) => {
      resolve.apply(this.emitter, args);
      this.emitter.removeListener(event, emit);
    };
    this.emitter.once(event, emit);
  });

  promise.timeout = timeout => {
    const timeoutErr = new Error('Timeout');
    clearTimeout(timer);
    return new Promise((resolve, reject) => {
      setTimeout(() => reject.call(this.emitter, timeoutErr), timeout);
      promise.then((...args) => {
        clearTimeout(timer);
        resolve.apply(this.emitter, args);
      });
    });
  };

  return promise;
};

PromiseEmitter.prototype.on = PromiseEmitter.prototype.once;

module.exports = PromiseEmitter;
