import { NavLink } from 'react-router-dom'

export default function AdminNav() {
  return (
    <>
      <NavLink to="/admin" className={({isActive}:{isActive:boolean})=>`btn ghost ${isActive?'mono':''}`} end>Admin</NavLink>
      <NavLink to="/admin/create" className={({isActive}:{isActive:boolean})=>`btn ghost ${isActive?'mono':''}`} end>Create</NavLink>
      <NavLink to="/admin/users" className={({isActive}:{isActive:boolean})=>`btn ghost ${isActive?'mono':''}`} end>Users</NavLink>
    </>
  )
}
