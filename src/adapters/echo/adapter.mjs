export function createEchoAdapter() {
  return {
    id: "echo",
    async sendMessage({ text }) {
      return {
        text: `Echo: ${text}`,
        raw: { echoed: true },
      };
    },
  };
}
