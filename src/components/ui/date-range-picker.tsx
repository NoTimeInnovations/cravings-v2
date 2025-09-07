import React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { addDays, format, isAfter, isBefore } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  className?: string
  onUpdate: (range: { startDate: Date; endDate: Date }) => void
  initialDateFrom?: Date
  initialDateTo?: Date
  align?: 'start' | 'center' | 'end'
}

export function DateRangePicker({
  className,
  onUpdate,
  initialDateFrom = addDays(new Date(), -7),
  initialDateTo = new Date(),
  align = 'center',
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: initialDateFrom,
    to: initialDateTo,
  })

  React.useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      onUpdate({
        startDate: dateRange.from,
        endDate: dateRange.to,
      })
    }
  }, [dateRange, onUpdate])

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd, y')} -{' '}
                  {format(dateRange.to, 'LLL dd, y')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            disabled={(date) =>
              isBefore(date, new Date('2000-01-01')) ||
              isAfter(date, new Date('2100-01-01'))
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}