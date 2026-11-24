import { useEffect, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Button, Tag, message } from 'antd'
import { LoginOutlined, SearchOutlined } from '@ant-design/icons'
import Layout from '../../Components/Layout'
import UserSearch from '../../Components/UserSearch'

const IMPERSONATABLE_ROLES = ['guidance', 'evaluator']

export default function Impersonate() {
    const { flash } = usePage().props
    const [selectedUser, setSelectedUser] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (flash?.error) message.error(flash.error)
    }, [flash?.error])

    const canImpersonate = selectedUser && IMPERSONATABLE_ROLES.includes(selectedUser.role)

    const handleImpersonate = () => {
        if (!canImpersonate) return
        router.post('/impersonate', { user_id: selectedUser.id }, {
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
            onError: () => message.error('Could not sign in as this user'),
        })
    }

    return (
        <div className="p-6 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in as user</h1>
                    <p className="text-gray-600">
                        See the system exactly as a guidance or evaluator account sees it.
                        A banner lets you return to your admin account at any time.
                    </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <UserSearch onUserSelect={setSelectedUser} selectedUserId={selectedUser?.id} />

                    {selectedUser && (
                        <div className="mt-4 p-4 bg-gray-100 rounded-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-medium text-gray-900">
                                    {selectedUser.username} <Tag className="ml-1">{selectedUser.role}</Tag>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{selectedUser.email}</p>
                                {!canImpersonate && (
                                    <p className="text-xs text-red-600 mt-2">
                                        Only guidance and evaluator accounts can be signed in as.
                                    </p>
                                )}
                            </div>
                            <Button
                                type="primary"
                                icon={<LoginOutlined />}
                                disabled={!canImpersonate}
                                loading={loading}
                                onClick={handleImpersonate}
                            >
                                Sign in as this user
                            </Button>
                        </div>
                    )}
                </div>

                {!selectedUser && (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <SearchOutlined className="text-4xl text-gray-300 mb-4" />
                        <p className="text-gray-500">Search for a guidance or evaluator account</p>
                    </div>
                )}

                <p className="text-xs text-gray-500">
                    Anything you do while signed in as someone else is done as that user. Each sign-in and
                    return is recorded in the application log.
                </p>
            </div>
        </div>
    )
}

Impersonate.layout = (page) => <Layout children={page} title='Sign in as user' />
