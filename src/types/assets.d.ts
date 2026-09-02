declare module '*.html' {
  const source: { uri: string };
  export default source;
}

declare module '*.wasm' {
  const source: { uri: string };
  export default source;
}
