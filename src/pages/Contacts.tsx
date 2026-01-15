import { useEffect, useState, useCallback } from "react"
import { RoleBasedLayout } from "@/components/RoleBasedLayout"
import axios from "axios"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Pencil, Trash2, Plus } from "lucide-react"
import { AdvancedSearchBar, type SearchColumn } from "@/components/shared/AdvancedSearchBar"
import { parseQuery } from "@/lib/query-parser"

import type { Contact } from "@/types/contact"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { formatError } from "@/lib/error-formatter"
import { toast } from "sonner"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingContactId, setDeletingContactId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10
  
  // Column configuration for search bar
  const searchColumns: SearchColumn[] = [
    { key: 'full_name', label: 'Full Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
  ]
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  })

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const validatePhone = (phone: string) => /^\+?[0-9\-\s()]{7,20}$/.test(phone)

  const fetchContacts = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const offset = (page - 1) * itemsPerPage
      const parsed = parseQuery(searchQuery, searchColumns)
      
      // Skip incomplete filters
      const completeFilters = parsed.filters.filter(f => f.value && f.value.trim())
      const effectiveParsed = {
        ...parsed,
        filters: completeFilters
      }
      
      let url = `${supabaseUrl}/rest/v1/contact?select=*`
      
      // Add text search
      if (effectiveParsed.textSearch && effectiveParsed.textSearch.trim()) {
        const searchPattern = `*${effectiveParsed.textSearch.trim()}*`
        url += `&or=(full_name.ilike.${encodeURIComponent(searchPattern)},email.ilike.${encodeURIComponent(searchPattern)},phone.ilike.${encodeURIComponent(searchPattern)})`
      }
      
      // Add filters
      for (const filter of effectiveParsed.filters) {
        const column = searchColumns.find(col => col.key === filter.column)
        if (!column) continue
        
        switch (filter.operator) {
          case '=':
          default:
            url += `&${filter.column}=ilike.${encodeURIComponent(`%${filter.value}%`)}`
            break
        }
      }
      
      // Add sorting
      if (effectiveParsed.sort) {
        url += `&order=${effectiveParsed.sort.column}.${effectiveParsed.sort.direction}`
      }
      
      url += `&limit=${itemsPerPage}&offset=${offset}`

      const response = await axios.get(url, {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
          "Prefer": "count=exact",
        },
      })

      // Get total count from Content-Range header
      const contentRange = response.headers["content-range"]
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/)
        if (match) {
          setTotalCount(parseInt(match[1], 10))
        }
      }

      setContacts(response.data || [])
    } catch (err: unknown) {
      console.error("Error fetching contacts:", err)
      const message = formatError(err) || "Failed to fetch contacts"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [supabaseUrl, supabaseAnonKey, itemsPerPage, searchQuery, searchColumns])

  // Main effect: fetch when page changes or search query changes (debounced)
  useEffect(() => {
    // Debounced search
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchContacts(1)
    }, searchQuery.trim() ? 1500 : 0)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Fetch when page changes
  useEffect(() => {
    fetchContacts(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const handleSearchApply = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }, [])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
    })
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingContact(null)
    setFormData({ full_name: "", email: "", phone: "" })
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (contactId: number) => {
    if (!confirm("Are you sure you want to delete this contact?")) return

    try {
      setDeletingContactId(contactId)

      await axios.delete(
        `${supabaseUrl}/rest/v1/contact?id=eq.${contactId}`,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      await fetchContacts(currentPage)
      toast.success("Contact deleted successfully")
    } catch (err: unknown) {
      console.error("Error deleting contact:", err)
      const message = formatError(err) || "Failed to delete contact"
      toast.error(message)
    } finally {
      setDeletingContactId(null)
    }
  }

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error("Please fill in all required fields")
      return
    }
    if (!validateEmail(formData.email)) {
      toast.error("Please enter a valid email address")
      return
    }
    if (!validatePhone(formData.phone)) {
      toast.error("Please enter a valid phone number")
      return
    }

    try {
      setIsSaving(true)

      if (editingContact) {
        // Update existing contact
        await axios.patch(
          `${supabaseUrl}/rest/v1/contact?id=eq.${editingContact.id}`,
          {
            full_name: formData.full_name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
          },
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation",
            },
          }
        )
      } else {
        // Create new contact
        await axios.post(
          `${supabaseUrl}/rest/v1/contact`,
          {
            full_name: formData.full_name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
          },
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation",
            },
          }
        )
      }

      setIsDialogOpen(false)
      setIsAddDialogOpen(false)
      await fetchContacts(currentPage)
      toast.success(editingContact ? "Contact updated successfully" : "Contact created successfully")
    } catch (err: unknown) {
      console.error("Error saving contact:", err)
      const message = formatError(err) || "Failed to save contact"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <RoleBasedLayout>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Contacts</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Contacts</h1>
            <Button onClick={handleAdd} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>

          {/* Unified Search/Filter/Sort Bar */}
          <div className="mb-4">
            <AdvancedSearchBar
              columns={searchColumns}
              value={searchQuery}
              onChange={setSearchQuery}
              onApply={handleSearchApply}
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <TableSkeleton
              columns={4}
              rows={10}
              hasActions={true}
              columnHeaders={["Full Name", "Email", "Phone", "Created At"]}
            />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {searchQuery ? "No contacts found matching your search." : "No contacts found. Click \"Add Contact\" to create one."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    contacts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell>{c.email}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell>{new Date(c.created_at).toISOString().split('T')[0]}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(c)}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(c.id)}
                              disabled={deletingContactId === c.id}
                              className="cursor-pointer"
                            >
                              {deletingContactId === c.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1)
                        }
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(page)
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }
                    return null
                  })}
                  
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < totalPages) {
                          setCurrentPage(currentPage + 1)
                        }
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update the contact information below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-fullname">Full Name *</FieldLabel>
                <Input
                  id="edit-fullname"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-email">Email *</FieldLabel>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-phone">Phone *</FieldLabel>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>Create a new contact by filling in the form below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-fullname">Full Name *</FieldLabel>
                <Input
                  id="add-fullname"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-email">Email *</FieldLabel>
                <Input
                  id="add-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-phone">Phone *</FieldLabel>
                <Input
                  id="add-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Creating..." : "Create Contact"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </RoleBasedLayout>
  )
}