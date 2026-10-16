import { useMemo, useRef, useState } from 'react';
import { Box, Input, Text } from '@chakra-ui/react';
import { IMAGE_TOKENS, type ImageToken } from '../../lib/imageSource';

/** Text before the caret that ends in an unclosed "{query" — the trigger for the variable dropdown. */
function openBrace(value: string, caret: number): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const start = before.lastIndexOf('{');
  if (start < 0) return null;
  const query = before.slice(start + 1);
  if (/[}\s]/.test(query)) return null;
  return { start, query };
}

/**
 * URL / template input with Template Builder's "type { to insert a variable" behaviour:
 * a dropdown lists the available data points, filtered as you type.
 */
export default function TokenInput({
  value,
  onChange,
  tokens = IMAGE_TOKENS,
  placeholder,
  isDisabled,
}: {
  value: string;
  onChange: (value: string) => void;
  tokens?: ImageToken[];
  placeholder?: string;
  isDisabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [active, setActive] = useState(0);

  const trigger = focused ? openBrace(value, caret) : null;
  const options = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    return tokens.filter((t) => t.name.toLowerCase().includes(q));
  }, [trigger, tokens]);
  const open = trigger != null && options.length > 0 && dismissedAt !== trigger.start;

  const syncCaret = () => {
    const el = inputRef.current;
    if (el && el.selectionStart != null) setCaret(el.selectionStart);
  };

  const insert = (token: ImageToken) => {
    if (!trigger) return;
    const afterCaret = value.slice(caret);
    const rest = afterCaret.startsWith('}') ? afterCaret.slice(1) : afterCaret;
    const head = `${value.slice(0, trigger.start)}{${token.name}}`;
    onChange(head + rest);
    setActive(0);
    setCaret(head.length);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(head.length, head.length);
    });
  };

  return (
    <Box position="relative">
      <Input
        ref={inputRef}
        size="sm"
        borderRadius="6px"
        fontFamily="mono"
        fontSize="12px"
        value={value}
        isDisabled={isDisabled}
        placeholder={placeholder}
        spellCheck={false}
        onFocus={() => {
          setFocused(true);
          syncCaret();
        }}
        onBlur={() => setFocused(false)}
        onClick={syncCaret}
        onKeyUp={syncCaret}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart ?? e.target.value.length);
          setDismissedAt(null);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % options.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + options.length) % options.length);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insert(options[Math.min(active, options.length - 1)]);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            if (trigger) setDismissedAt(trigger.start);
          }
        }}
      />
      {open && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          zIndex={30}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="8px"
          boxShadow="0 6px 20px rgba(0,0,0,0.14)"
          py={1}
          maxH="220px"
          overflowY="auto"
          role="listbox"
        >
          <Text px={3} pt={1} pb={1} fontSize="10px" fontWeight={700} letterSpacing="0.4px" color="gray.500">
            AVAILABLE VARIABLES
          </Text>
          {options.map((t, i) => (
            <Box
              key={t.name}
              role="option"
              aria-selected={i === active}
              px={3}
              py={1.5}
              cursor="pointer"
              bg={i === active ? 'mcBlue.50' : 'transparent'}
              onMouseEnter={() => setActive(i)}
              // keep input focus so the caret position survives the click
              onMouseDown={(e) => {
                e.preventDefault();
                insert(t);
              }}
            >
              <Text fontSize="12px" fontFamily="mono" fontWeight={600} color="gray.800">
                {`{${t.name}}`}
              </Text>
              <Text fontSize="11px" color="gray.500">
                {t.description} · preview: {t.value}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
