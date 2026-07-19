type Props = {
  open: boolean
  value: string
  onChange: (value: string) => void
  onSubmit: (finalValue: number) => void
  onClose: () => void
}

export function Calculator({ open, value, onChange, onSubmit, onClose }: Props) {
  const insert = (digit: string) => {
    if (value === '0' || value === '') {
      onChange(digit)
      return
    }
    // If last char is an operator, start new number after it
    onChange(value + digit)
  }

  const backspace = () => {
    onChange(value.slice(0, -1) || '0')
  }

  const clear = () => onChange('0')

  const addOp = (op: string) => {
    const trimmed = value.replace(/[+\-*/]$/, '')
    onChange(trimmed + op)
  }

  const evaluate = (): number => {
    try {
      // Safe-ish eval for simple arithmetic only
      if (!/^[\d+\-*/.\s]+$/.test(value)) return 0
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${value})`)() as number
      if (!Number.isFinite(result)) return 0
      return Math.ceil(result)
    } catch {
      return Math.ceil(parseFloat(value) || 0)
    }
  }

  const equals = () => {
    const result = evaluate()
    onChange(String(result))
  }

  const submit = () => {
    onSubmit(evaluate())
    onClose()
  }

  if (!open) return null

  const pads = ['7', '8', '9', '4', '5', '6', '1', '2', '3']

  return (
    <div className="calculator" role="dialog" aria-label="เครื่องคิดเลข">
      <div className="calculator__panel">
        <div className="calculator__grid">
          <div className="calculator__nums">
            {pads.map((n) => (
              <button key={n} type="button" className="calpad" onClick={() => insert(n)}>
                {n}
              </button>
            ))}
            <button type="button" className="calpad calpad--muted" onClick={clear}>
              clear
            </button>
            <button type="button" className="calpad" onClick={() => insert('0')}>
              0
            </button>
            <button type="button" className="calpad" onClick={backspace} aria-label="ลบ">
              ⌫
            </button>
            <button type="button" className="calpad calpad--ok" onClick={submit}>
              ok
            </button>
          </div>
          <div className="calculator__ops">
            <button type="button" onClick={() => addOp('/')}>÷</button>
            <button type="button" onClick={() => addOp('*')}>×</button>
            <button type="button" onClick={() => addOp('-')}>−</button>
            <button type="button" onClick={() => addOp('+')}>+</button>
            <button type="button" className="calpad--eq" onClick={equals}>=</button>
          </div>
        </div>
      </div>
    </div>
  )
}
