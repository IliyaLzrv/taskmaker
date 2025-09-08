import { NavLink } from 'react-router-dom'

export default function UserNav() {
  return (
    <>
      <NavLink to="/tasks" className={({isActive}:{isActive:boolean})=>`btn ghost ${isActive?'mono':''}`} end>My Tasks</NavLink>
      <NavLink to="/tasks/done" className={({isActive}:{isActive:boolean})=>`btn ghost ${isActive?'mono':''}`} end>Completed</NavLink>
      <NavLink to="/me" className={({isActive}:{isActive:boolean})=>`btn ghost ${isActive?'mono':''}`} end>Profile</NavLink>
    </>
  )
}
