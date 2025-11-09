export function useKeyboardControls(onForce) {
  const [keys, setKeys] = useState(new Set());
  
  useEffect(() => {
    // Clean keyboard event handling
    // Return force based on keys held
  }, []);
  
  return { currentForce: computeForceFromKeys(keys) };
}