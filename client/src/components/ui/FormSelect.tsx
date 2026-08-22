interface Option {
  value:string;
  label:string;
}

interface Props {
  label:string;
  value:string;
  options:Option[];
  onChange:(value:string)=>void;
}

export default function FormSelect({
  label,
  value,
  options,
  onChange,
}:Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </label>

      <select
        value={value}
        onChange={(e)=>
          onChange(e.target.value)
        }
        className="
          w-full rounded-lg border
          bg-white text-gray-900
          px-3 py-2
          dark:border-gray-700
          dark:bg-gray-800
          dark:text-white
        "
      >
        {options.map((option)=>(
          <option
            key={option.value}
            value={option.value}
            className="
              bg-white text-gray-900
              dark:bg-gray-800
              dark:text-white
            "
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
