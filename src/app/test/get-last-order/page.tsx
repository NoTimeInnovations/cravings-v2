import { getAuthCookie } from '@/app/auth/actions'
import { getNextOrderNumber } from '@/store/orderStore';
import React from 'react'

const page = async() => {

    const cookieData = await getAuthCookie();
    
    if (cookieData) {
        const lastorder = await getNextOrderNumber(cookieData.id);
        console.log(lastorder);
    }

  return (
    <div>page</div>
  )
}

export default page