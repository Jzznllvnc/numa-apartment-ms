import { useState, forwardRef } from 'react'
import { Eye, EyeClosed } from 'lucide-react'

interface PasswordInputProps {
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  className?: string
  disabled?: boolean
  autoComplete?: string
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ 
    id, 
    value, 
    onChange, 
    placeholder = "Enter your password", 
    required = false,
    minLength,
    className = "",
    disabled = false,
    autoComplete = "current-password",
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    const baseClassName = "w-full px-3 py-3 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"

    return (
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`${baseClassName} ${className}`}
          {...props}
        />
        
        {/* Custom Eye Icon Button */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeClosed className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput 