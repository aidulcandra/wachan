const names = {}

async function queue(name, input, task) {
  queue.run = async function (qu) {
    if (!qu.running) {
      qu.running = true;
      while (qu.list.length) {
        const next = qu.list.shift();
        let result
        try {
          result = await next.task(next.input);
          next.resolve(result);
        } catch (error) {
          next.reject(error)
        }
      }
      qu.running = false;
    }
  };
  const q = (names[name] ??= {
    list: [],
    running: false,
  });
  return new Promise((resolve,reject) => {
    q.list.push({ input, task, resolve, reject });
    queue.run(q);
  });
}

module.exports = { queue }