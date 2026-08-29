import { useState } from 'react'
import Layout from '../../Components/Layout'
import { EyeOutlined, EyeInvisibleOutlined, CopyOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Input, Checkbox, Slider, Space, Tooltip, message } from 'antd'
import axios from 'axios'
import UserSearch from '../../Components/UserSearch'

export default function ManagePassword() {
    const [selectedUser, setSelectedUser] = useState(null)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(true)
    const [passwordLength, setPasswordLength] = useState(16)
    const [useUppercase, setUseUppercase] = useState(true)
    const [useLowercase, setUseLowercase] = useState(true)
    const [useNumbers, setUseNumbers] = useState(true)
    const [useSymbols, setUseSymbols] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleUserSelect = (userData) => {
        setSelectedUser(userData)
        setPassword('')
        setShowPassword(false)
    }

    const generatePassword = () => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const lowercase = 'abcdefghijklmnopqrstuvwxyz'
        const numbers = '0123456789'
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

        let chars = ''
        if (useUppercase) chars += uppercase
        if (useLowercase) chars += lowercase
        if (useNumbers) chars += numbers
        if (useSymbols) chars += symbols

        if (!chars) {
            message.error('Select at least one character type')
            return
        }

        let generatedPassword = ''
        for (let i = 0; i < passwordLength; i++) {
            generatedPassword += chars.charAt(
                Math.floor(Math.random() * chars.length)
            )
        }

        setPassword(generatedPassword)
        setShowPassword(true)
    }

    const copyToClipboard = () => {
        if (!password) {
            message.error('No password to copy')
            return
        }
        navigator.clipboard.writeText(password).then(() => {
            message.success('Copied to clipboard')
        })
    }

    const handleChangePassword = async () => {
        if (!password.trim()) {
            message.error('Please enter a password')
            return
        }

        setLoading(true)
        try {
            await axios.post('/change-password', {
                user_id: selectedUser.id,
                password: password,
            })
            message.success(`Password changed for ${selectedUser.username}`)
            setSelectedUser(null)
            setPassword('')
            setShowPassword(false)
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to change password'
            message.error(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Manage Password
                    </h1>
                    <p className="text-gray-600">
                        Generate secure passwords or customize your own
                    </p>
                </div>

                {/* User Selection Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <UserSearch
                        onUserSelect={handleUserSelect}
                        selectedUserId={selectedUser?.id}
                    />

                    {selectedUser && (
                        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">
                                Selected User
                            </p>
                            <p className="font-medium text-gray-900">
                                {selectedUser.username}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedUser.email}
                            </p>
                        </div>
                    )}
                </div>

                {/* Password Card */}
                {selectedUser && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <Space.Compact block>
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter or generate a password"
                                    className="flex-1"
                                />
                                <Tooltip title={showPassword ? 'Hide' : 'Show'}>
                                    <Button
                                        icon={showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                        onClick={() => setShowPassword(!showPassword)}
                                    />
                                </Tooltip>
                                <Tooltip title="Copy to clipboard">
                                    <Button
                                        icon={<CopyOutlined />}
                                        onClick={copyToClipboard}
                                    />
                                </Tooltip>
                            </Space.Compact>
                        </div>

                        {/* Character Options */}
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">
                                Generator options
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <Checkbox
                                    checked={useUppercase}
                                    onChange={(e) => setUseUppercase(e.target.checked)}
                                >
                                    <span className="text-sm text-gray-700">Uppercase (A-Z)</span>
                                </Checkbox>
                                <Checkbox
                                    checked={useLowercase}
                                    onChange={(e) => setUseLowercase(e.target.checked)}
                                >
                                    <span className="text-sm text-gray-700">Lowercase (a-z)</span>
                                </Checkbox>
                                <Checkbox
                                    checked={useNumbers}
                                    onChange={(e) => setUseNumbers(e.target.checked)}
                                >
                                    <span className="text-sm text-gray-700">Numbers (0-9)</span>
                                </Checkbox>
                                <Checkbox
                                    checked={useSymbols}
                                    onChange={(e) => setUseSymbols(e.target.checked)}
                                >
                                    <span className="text-sm text-gray-700">Symbols (!@#$%^&*)</span>
                                </Checkbox>
                            </div>
                        </div>

                        {/* Length Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Length</span>
                                <span className="text-lg font-semibold text-blue-600">
                                    {passwordLength}
                                </span>
                            </div>
                            <Slider
                                min={8}
                                max={30}
                                value={passwordLength}
                                onChange={setPasswordLength}
                            />
                        </div>

                        {/* Button Group */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                block
                                icon={<ReloadOutlined />}
                                onClick={generatePassword}
                            >
                                Generate
                            </Button>
                            <Button
                                type="primary"
                                block
                                size="large"
                                loading={loading}
                                onClick={handleChangePassword}
                            >
                                Change Password
                            </Button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!selectedUser && (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <SearchOutlined className="text-4xl text-gray-300 mb-4" />
                        <p className="text-gray-500">
                            Select a user to manage their password
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

ManagePassword.layout = (page) => <Layout children={page} title='Manage Password'/>