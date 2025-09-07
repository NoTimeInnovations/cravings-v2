import React, { ImgHTMLAttributes } from 'react'

const Img = (props: ImgHTMLAttributes<HTMLImageElement>) => {
  return (
    <img {...props} />
  )
}

export default Img