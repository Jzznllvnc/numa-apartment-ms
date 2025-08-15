import { useState, forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Eye, EyeClosed } from 'lucide-react'

interface PasswordInputUIProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  className?: string
  disabled?: boolean
  autoComplete?: string
  type?: string
}

const PasswordInputUI = forwardRef<HTMLInputElement, PasswordInputUIProps>(
  ({ 
    value, 
    onChange, 
    placeholder = "Enter password", 
    required = false,
    minLength,
    className = "",
    disabled = false,
    autoComplete = "current-password",
    type = "password",
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`pr-12 ${className}`}
          {...props}
        />
        
        {/* Custom Eye Icon Button */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed z-10"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeClosed className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    )
  }
)

PasswordInputUI.displayName = 'PasswordInputUI'

export default PasswordInputUI 