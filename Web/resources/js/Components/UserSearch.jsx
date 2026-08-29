import { useState, useRef } from 'react'
import { Select, Spin } from 'antd'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export default function UserSearch({ onUserSelect, selectedUserId }) {
    const [searchQuery, setSearchQuery] = useState('')
    const searchTimeoutRef = useRef(null)

    const { data: userOptions = [], isLoading: searching } = useQuery({
        queryKey: ['searchUsers', searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.trim().length < 2) {
                return []
            }
            const res = await axios.post('/search-user', { query: searchQuery })
            return res.data.map(user => ({
                label: `${user.username} (${user.email})`,
                value: user.id,
                data: user
            }))
        },
        enabled: searchQuery.length >= 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const handleSearch = (query) => {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = setTimeout(() => {
            setSearchQuery(query)
        }, 300)
    }

    const handleUserSelect = (value) => {
        const selectedOption = userOptions.find(opt => opt.value === value)
        if (selectedOption && onUserSelect) {
            onUserSelect(selectedOption.data)
        }
    }

    const handleClear = () => {
        setSearchQuery('')
        onUserSelect(null)
    }

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
            </label>
            <Select
                placeholder="Type at least 2 characters to search..."
                options={userOptions}
                value={selectedUserId}
                onChange={handleUserSelect}
                onSearch={handleSearch}
                showSearch
                allowClear
                notFoundContent={searching ? <Spin size="small" /> : null}
                loading={searching}
                filterOption={false}
                onClear={handleClear}
                className="w-full"
            />
        </div>
    )
}