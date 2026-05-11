import { useState, useEffect, useRef } from 'react'
import { Users, BarChart3, Clock, Image, Loader2, RefreshCw, User, Medal, Search, X, ChevronLeft, Copy, Check, AtSign, FileText } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import DateRangePicker from '../components/DateRangePicker'
import ChatBackground from '../components/ChatBackground'
import './GroupAnalyticsPage.scss'

interface GroupChatInfo {
  username: string
  displayName: string
  memberCount: number
  avatarUrl?: string
}

interface GroupMember {
  username: string
  displayName: string
  avatarUrl?: string
}

interface GroupMessageRank {
  member: GroupMember
  messageCount: number
}

interface GroupEvents {
  mentions: Array<{ member: GroupMember; count: number }>
  systemEvents: Array<{ type: 'join' | 'leave' | 'other'; content: string; createTime: number }>
  firstSpeaker: GroupMember | null
  averageMessageLength: number
  totalMessages: number
  joinCount: number
  leaveCount: number
  partialFailureCount?: number
}

interface GroupMessageBreakdown {
  mediaStats: { typeCounts: Array<{ type: number; name: string; count: number }>; total: number; appSubtypes?: Array<{ type: number; name: string; count: number }> }
  firstSpeaker: GroupMember | null
  averageMessageLength: number
  partialFailureCount?: number
}

type AnalysisFunction = 'members' | 'ranking' | 'activeHours' | 'mediaStats' | 'events' | 'breakdown'

function GroupAnalyticsPage() {
  const [groups, setGroups] = useState<GroupChatInfo[]>([])
  const [filteredGroups, setFilteredGroups] = useState<GroupChatInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<GroupChatInfo | null>(null)
  const [selectedFunction, setSelectedFunction] = useState<AnalysisFunction | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 功能数据
  const [members, setMembers] = useState<GroupMember[]>([])
  const [rankings, setRankings] = useState<GroupMessageRank[]>([])
  const [activeHours, setActiveHours] = useState<Record<number, number>>({})
  const [mediaStats, setMediaStats] = useState<{ typeCounts: Array<{ type: number; name: string; count: number }>; total: number } | null>(null)
  const [groupEvents, setGroupEvents] = useState<GroupEvents | null>(null)
  const [messageBreakdown, setMessageBreakdown] = useState<GroupMessageBreakdown | null>(null)
  const [functionLoading, setFunctionLoading] = useState(false)

  // 成员详情弹框
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // 时间范围
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [dateRangeReady, setDateRangeReady] = useState(false)

  // 拖动调整宽度
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const groupsLoadStateRef = useRef({ isLoading: false, lastLoadAt: 0 })

  useEffect(() => {
    loadGroups()
  }, [])

  // 窗口可见性变化时刷新数据（节流）
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) return
      const now = Date.now()
      if (now - groupsLoadStateRef.current.lastLoadAt < 15000) return
      await loadGroups()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (searchQuery) {
      setFilteredGroups(groups.filter(g => g.displayName.toLowerCase().includes(searchQuery.toLowerCase())))
    } else {
      setFilteredGroups(groups)
    }
  }, [searchQuery, groups])

  // 拖动调整宽度
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = e.clientX - containerRect.left
      setSidebarWidth(Math.max(250, Math.min(450, newWidth)))
    }
    const handleMouseUp = () => setIsResizing(false)
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // 日期范围变化时自动刷新
  useEffect(() => {
    if (dateRangeReady && selectedGroup && selectedFunction && selectedFunction !== 'members') {
      setDateRangeReady(false)
      loadFunctionData(selectedFunction)
    }
  }, [dateRangeReady])

  const loadGroups = async () => {
    if (groupsLoadStateRef.current.isLoading) return
    groupsLoadStateRef.current.isLoading = true
    groupsLoadStateRef.current.lastLoadAt = Date.now()
    setIsLoading(true)
    try {
      const result = await window.electronAPI.groupAnalytics.getGroupChats()
      if (result.success && result.data) {
        setGroups(result.data)
        setFilteredGroups(result.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
      groupsLoadStateRef.current.isLoading = false
    }
  }

  const handleGroupSelect = (group: GroupChatInfo) => {
    if (selectedGroup?.username !== group.username) {
      setSelectedGroup(group)
      setSelectedFunction(null)
    }
  }


  const handleFunctionSelect = async (func: AnalysisFunction) => {
    if (!selectedGroup) return
    setSelectedFunction(func)
    await loadFunctionData(func)
  }

  const loadFunctionData = async (func: AnalysisFunction) => {
    if (!selectedGroup) return
    setFunctionLoading(true)

    // 计算时间戳
    const startTime = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined
    const endTime = endDate ? (() => {
      const d = new Date(endDate + 'T00:00:00')
      d.setDate(d.getDate() + 1)
      return Math.floor(d.getTime() / 1000)
    })() : undefined

    try {
      switch (func) {
        case 'members': {
          const result = await window.electronAPI.groupAnalytics.getGroupMembers(selectedGroup.username)
          if (result.success && result.data) setMembers(result.data)
          break
        }
        case 'ranking': {
          const result = await window.electronAPI.groupAnalytics.getGroupMessageRanking(selectedGroup.username, 20, startTime, endTime)
          if (result.success && result.data) setRankings(result.data)
          break
        }
        case 'activeHours': {
          const result = await window.electronAPI.groupAnalytics.getGroupActiveHours(selectedGroup.username, startTime, endTime)
          if (result.success && result.data) setActiveHours(result.data.hourlyDistribution)
          break
        }
        case 'mediaStats': {
          const result = await window.electronAPI.groupAnalytics.getGroupMediaStats(selectedGroup.username, startTime, endTime)
          if (result.success && result.data) setMediaStats(result.data)
          break
        }
        case 'events': {
          const result = await window.electronAPI.groupAnalytics.getGroupEvents(selectedGroup.username, startTime, endTime)
          if (result.success && result.data) setGroupEvents(result.data)
          break
        }
        case 'breakdown': {
          const result = await window.electronAPI.groupAnalytics.getGroupMessageBreakdown(selectedGroup.username, startTime, endTime)
          if (result.success && result.data) setMessageBreakdown(result.data)
          break
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setFunctionLoading(false)
    }
  }

  const formatEventTime = (ts: number) => {
    const d = new Date(ts * 1000)
    const now = Date.now()
    const diff = now - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return '昨天'
    if (days < 30) return `${days}天前`
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  const formatNumber = (num: number) => {
    const value = Number(num || 0)
    if (!Number.isFinite(value) || value < 0) return '0'
    if (value >= 1e8) return (value / 1e8).toFixed(2) + '亿'
    if (value >= 1e4) return (value / 1e4).toFixed(1) + '万'
    return Math.round(value).toLocaleString()
  }

  const getHourlyOption = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const data = hours.map(h => activeHours[h] || 0)
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: hours.map(h => `${h}时`) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data, itemStyle: { color: '#07c160', borderRadius: [4, 4, 0, 0] } }]
    }
  }

  const getMediaOption = () => {
    if (!mediaStats || mediaStats.typeCounts.length === 0) return {}
    
    // 定义颜色映射
    const colorMap: Record<number, string> = {
      1: '#3b82f6',   // 文本 - 蓝色
      3: '#22c55e',   // 图片 - 绿色
      34: '#f97316',  // 语音 - 橙色
      43: '#a855f7',  // 视频 - 紫色
      47: '#ec4899',  // 表情包 - 粉色
      49: '#14b8a6',  // 链接/文件 - 青色
      [-1]: '#6b7280', // 其他 - 灰色
    }
    
    const data = mediaStats.typeCounts.map(item => ({
      name: item.name,
      value: item.count,
      itemStyle: { color: colorMap[item.type] || '#6b7280' }
    }))
    
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        itemStyle: { borderRadius: 8, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 2 },
        label: { 
          show: true, 
          formatter: (params: { name: string; percent: number }) => {
            // 只显示占比大于3%的标签
            return params.percent > 3 ? `${params.name}\n${params.percent.toFixed(1)}%` : ''
          },
          color: '#fff'
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 10
        },
        data
      }]
    }
  }

  const handleRefresh = () => {
    if (selectedFunction) {
      loadFunctionData(selectedFunction)
    }
  }

  const handleDateRangeComplete = () => {
    setDateRangeReady(true)
  }

  const handleMemberClick = (member: GroupMember) => {
    setSelectedMember(member)
    setCopiedField(null)
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (e) {
      console.error('复制失败:', e)
    }
  }

  const renderMemberModal = () => {
    if (!selectedMember) return null

    return (
      <div className="member-modal-overlay" onClick={() => setSelectedMember(null)}>
        <div className="member-modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setSelectedMember(null)}>
            <X size={20} />
          </button>
          <div className="modal-content">
            <div className="member-avatar large">
              {selectedMember.avatarUrl ? (
                <img src={selectedMember.avatarUrl} alt="" />
              ) : (
                <div className="avatar-placeholder"><User size={48} /></div>
              )}
            </div>
            <h3 className="member-display-name">{selectedMember.displayName}</h3>
            <div className="member-details">
              <div className="detail-row">
                <span className="detail-label">微信ID</span>
                <span className="detail-value">{selectedMember.username}</span>
                <button className="copy-btn" onClick={() => handleCopy(selectedMember.username, 'username')}>
                  {copiedField === 'username' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="detail-row">
                <span className="detail-label">昵称</span>
                <span className="detail-value">{selectedMember.displayName}</span>
                <button className="copy-btn" onClick={() => handleCopy(selectedMember.displayName, 'displayName')}>
                  {copiedField === 'displayName' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderGroupList = () => (
    <div className="group-sidebar" style={{ width: sidebarWidth }}>
      <div className="sidebar-header">
        <div className="search-row">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="搜索群聊..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="close-search" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <button className="refresh-btn" onClick={loadGroups} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>
      <div className="group-list">
        {isLoading ? (
          <div className="loading-groups">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-item">
                <div className="skeleton-avatar" />
                <div className="skeleton-content">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="empty-groups">
            <Users size={48} />
            <p>{searchQuery ? '未找到匹配的群聊' : '暂无群聊数据'}</p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <div
              key={group.username}
              className={`group-item ${selectedGroup?.username === group.username ? 'active' : ''}`}
              onClick={() => handleGroupSelect(group)}
            >
              <div className="group-avatar">
                {group.avatarUrl ? <img src={group.avatarUrl} alt="" /> : <div className="avatar-placeholder"><Users size={20} /></div>}
              </div>
              <div className="group-info">
                <span className="group-name">{group.displayName}</span>
                <span className="group-members">{group.memberCount} 位成员</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )


  const renderFunctionMenu = () => (
    <div className="function-menu">
      <div className="selected-group-info">
        <div className="group-avatar large">
          {selectedGroup?.avatarUrl ? <img src={selectedGroup.avatarUrl} alt="" /> : <div className="avatar-placeholder"><Users size={40} /></div>}
        </div>
        <h2>{selectedGroup?.displayName}</h2>
        <p>{selectedGroup?.memberCount} 位成员</p>
      </div>
      <div className="function-grid">
        <div className="function-card" onClick={() => handleFunctionSelect('members')}>
          <Users size={32} />
          <span>群成员查看</span>
        </div>
        <div className="function-card" onClick={() => handleFunctionSelect('ranking')}>
          <BarChart3 size={32} />
          <span>群聊发言排行</span>
        </div>
        <div className="function-card" onClick={() => handleFunctionSelect('activeHours')}>
          <Clock size={32} />
          <span>群聊活跃时段</span>
        </div>
        <div className="function-card" onClick={() => handleFunctionSelect('mediaStats')}>
          <Image size={32} />
          <span>媒体内容统计</span>
        </div>
        <div className="function-card" onClick={() => handleFunctionSelect('events')}>
          <AtSign size={32} />
          <span>群事件洞察</span>
        </div>
        <div className="function-card" onClick={() => handleFunctionSelect('breakdown')}>
          <FileText size={32} />
          <span>消息细分</span>
        </div>
      </div>
    </div>
  )

  const renderFunctionContent = () => {
    const getFunctionTitle = () => {
      switch (selectedFunction) {
        case 'members': return '群成员查看'
        case 'ranking': return '群聊发言排行'
        case 'activeHours': return '群聊活跃时段'
        case 'mediaStats': return '媒体内容统计'
        case 'events': return '群事件洞察'
        case 'breakdown': return '消息细分'
        default: return ''
      }
    }

    const showDateRange = selectedFunction !== 'members'

    return (
      <div className="function-content">
        <div className="content-header">
          <button className="back-btn" onClick={() => setSelectedFunction(null)}>
            <ChevronLeft size={20} />
          </button>
          <div className="header-info">
            <h3>{getFunctionTitle()}</h3>
            <span className="header-subtitle">{selectedGroup?.displayName}</span>
          </div>
          {showDateRange && (
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onRangeComplete={handleDateRangeComplete}
            />
          )}
          <button className="refresh-btn" onClick={handleRefresh} disabled={functionLoading}>
            <RefreshCw size={16} className={functionLoading ? 'spin' : ''} />
          </button>
        </div>
        <div className="content-body">
          {functionLoading ? (
            <div className="content-loading"><Loader2 size={32} className="spin" /></div>
          ) : (
            <>
              {selectedFunction === 'members' && (
                <div className="members-grid">
                  {members.map(member => (
                    <div key={member.username} className="member-card" onClick={() => handleMemberClick(member)}>
                      <div className="member-avatar">
                        {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <div className="avatar-placeholder"><User size={20} /></div>}
                      </div>
                      <span className="member-name">{member.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedFunction === 'ranking' && (
                <div className="rankings-list">
                  {rankings.map((item, index) => (
                    <div key={item.member.username} className="ranking-item">
                      <span className={`rank ${index < 3 ? 'top' : ''}`}>{index + 1}</span>
                      <div className="contact-avatar">
                        {item.member.avatarUrl ? <img src={item.member.avatarUrl} alt="" /> : <div className="avatar-placeholder"><User size={20} /></div>}
                        {index < 3 && <div className={`medal medal-${index + 1}`}><Medal size={10} /></div>}
                      </div>
                      <div className="contact-info">
                        <span className="contact-name">{item.member.displayName}</span>
                      </div>
                      <span className="message-count">{formatNumber(item.messageCount)} 条</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedFunction === 'activeHours' && (
                <div className="chart-container">
                  <ReactECharts option={getHourlyOption()} style={{ height: '100%', minHeight: 300 }} />
                </div>
              )}
              {selectedFunction === 'mediaStats' && mediaStats && (
                <div className="media-stats">
                  <div className="media-layout">
                    <div className="chart-container">
                      <ReactECharts option={getMediaOption()} style={{ height: '100%', minHeight: 300 }} />
                    </div>
                    <div className="media-legend">
                      {mediaStats.typeCounts.map(item => {
                        const colorMap: Record<number, string> = {
                          1: '#3b82f6', 3: '#22c55e', 34: '#f97316',
                          43: '#a855f7', 47: '#ec4899', 49: '#14b8a6', [-1]: '#6b7280'
                        }
                        const percentage = mediaStats.total > 0 ? ((item.count / mediaStats.total) * 100).toFixed(1) : '0'
                        return (
                          <div key={item.type} className="legend-item">
                            <span className="legend-color" style={{ backgroundColor: colorMap[item.type] || '#6b7280' }} />
                            <span className="legend-name">{item.name}</span>
                            <span className="legend-count">{formatNumber(item.count)} 条</span>
                            <span className="legend-percent">({percentage}%)</span>
                          </div>
                        )
                      })}
                      <div className="legend-total">
                        <span>总计</span>
                        <span>{formatNumber(mediaStats.total)} 条</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {selectedFunction === 'events' && groupEvents && (
                <div className="events-panel">
                  {!!groupEvents.partialFailureCount && (
                    <p className="partial-failure-hint">部分数据库读取失败（{groupEvents.partialFailureCount} 个分片）</p>
                  )}
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <span className="kpi-value">{formatNumber(groupEvents.totalMessages)}</span>
                      <span className="kpi-label">总消息数</span>
                    </div>
                    <div className="kpi-card kpi-accent-green">
                      <span className="kpi-value">{groupEvents.joinCount}</span>
                      <span className="kpi-label">成员入群</span>
                    </div>
                    <div className="kpi-card kpi-accent-red">
                      <span className="kpi-value">{groupEvents.leaveCount}</span>
                      <span className="kpi-label">成员退群</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">{groupEvents.averageMessageLength}<small> 字</small></span>
                      <span className="kpi-label">平均消息长度</span>
                    </div>
                  </div>

                  {groupEvents.firstSpeaker && (
                    <div className="events-section">
                      <h4 className="section-title">最早发言人</h4>
                      <div className="first-speaker-card">
                        <div className="first-speaker-avatar">
                          {groupEvents.firstSpeaker.avatarUrl
                            ? <img src={groupEvents.firstSpeaker.avatarUrl} alt="" />
                            : <div className="avatar-placeholder"><User size={18} /></div>}
                        </div>
                        <span className="first-speaker-name">{groupEvents.firstSpeaker.displayName}</span>
                        <span className="first-speaker-badge">首位</span>
                      </div>
                    </div>
                  )}

                  {groupEvents.mentions.length > 0 && (
                    <div className="events-section">
                      <h4 className="section-title"><AtSign size={13} /> @提及排行</h4>
                      <div className="mention-list">
                        {groupEvents.mentions.slice(0, 10).map((item, index) => {
                          const maxCount = groupEvents.mentions[0].count
                          const width = maxCount > 0 ? (item.count / maxCount * 100).toFixed(0) : 0
                          return (
                            <div key={item.member.username} className="mention-item">
                              <span className="mention-rank">{index + 1}</span>
                              <div className="mention-avatar">
                                {item.member.avatarUrl
                                  ? <img src={item.member.avatarUrl} alt="" />
                                  : <div className="avatar-placeholder"><User size={12} /></div>}
                              </div>
                              <span className="mention-name">{item.member.displayName}</span>
                              <div className="mention-bar-wrap">
                                <div className="mention-bar" style={{ width: `${width}%` }} />
                              </div>
                              <span className="mention-count">{formatNumber(item.count)} 次</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {groupEvents.systemEvents.length > 0 && (
                    <div className="events-section">
                      <h4 className="section-title">群成员动态</h4>
                      <div className="timeline-list">
                        {groupEvents.systemEvents.slice(-30).reverse().map((event, index) => (
                          <div key={`${event.createTime}-${index}`} className={`timeline-item timeline-${event.type}`}>
                            <div className={`timeline-dot dot-${event.type}`} />
                            <span className="timeline-type">{event.type === 'join' ? '入群' : event.type === 'leave' ? '退群' : '系统'}</span>
                            <span className="timeline-content">{event.content}</span>
                            <span className="timeline-time">{formatEventTime(event.createTime)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {selectedFunction === 'breakdown' && messageBreakdown && (
                <div className="breakdown-panel">
                  {!!messageBreakdown.partialFailureCount && (
                    <p className="partial-failure-hint">部分数据库读取失败（{messageBreakdown.partialFailureCount} 个分片）</p>
                  )}
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <span className="kpi-value">{formatNumber(messageBreakdown.mediaStats.total)}</span>
                      <span className="kpi-label">总消息数</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">
                        {formatNumber(messageBreakdown.mediaStats.typeCounts.find(t => t.type === 1)?.count || 0)}
                      </span>
                      <span className="kpi-label">文本消息</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">
                        {formatNumber(
                          (messageBreakdown.mediaStats.typeCounts.find(t => t.type === 3)?.count || 0) +
                          (messageBreakdown.mediaStats.typeCounts.find(t => t.type === 43)?.count || 0)
                        )}
                      </span>
                      <span className="kpi-label">图片 / 视频</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">{messageBreakdown.averageMessageLength}<small> 字</small></span>
                      <span className="kpi-label">平均消息长度</span>
                    </div>
                  </div>

                  {messageBreakdown.mediaStats.typeCounts.length > 0 && (
                    <div className="breakdown-section">
                      <h4 className="section-title">消息类型分布</h4>
                      <div className="bar-chart-list">
                        {(() => {
                          const colorMap: Record<number, string> = {
                            1: '#3b82f6', 3: '#22c55e', 34: '#f97316',
                            43: '#a855f7', 47: '#ec4899', 49: '#14b8a6', [-1]: '#6b7280'
                          }
                          const total = messageBreakdown.mediaStats.total
                          const maxCount = messageBreakdown.mediaStats.typeCounts[0]?.count || 1
                          return messageBreakdown.mediaStats.typeCounts.map(item => {
                            const pct = total > 0 ? (item.count / total * 100).toFixed(1) : '0'
                            const barWidth = (item.count / maxCount * 100).toFixed(0)
                            const color = colorMap[item.type] || '#6b7280'
                            return (
                              <div key={item.type} className="bar-item">
                                <span className="bar-label">{item.name}</span>
                                <div className="bar-track">
                                  <div className="bar-fill" style={{ width: `${barWidth}%`, background: color }} />
                                </div>
                                <span className="bar-pct">{pct}%</span>
                                <span className="bar-count">{formatNumber(item.count)}</span>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}

                  {(messageBreakdown.mediaStats.appSubtypes || []).length > 0 && (
                    <div className="breakdown-section">
                      <h4 className="section-title">链接与应用细分</h4>
                      <div className="bar-chart-list">
                        {(() => {
                          const subtypes = messageBreakdown.mediaStats.appSubtypes || []
                          const maxCount = subtypes[0]?.count || 1
                          return subtypes.map(item => {
                            const total = subtypes.reduce((s, i) => s + i.count, 0)
                            const pct = total > 0 ? (item.count / total * 100).toFixed(1) : '0'
                            const barWidth = (item.count / maxCount * 100).toFixed(0)
                            return (
                              <div key={item.type} className="bar-item">
                                <span className="bar-label">{item.name}</span>
                                <div className="bar-track">
                                  <div className="bar-fill" style={{ width: `${barWidth}%`, background: '#14b8a6' }} />
                                </div>
                                <span className="bar-pct">{pct}%</span>
                                <span className="bar-count">{formatNumber(item.count)}</span>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}

                  {messageBreakdown.firstSpeaker && (
                    <div className="breakdown-section">
                      <h4 className="section-title">首位发言人</h4>
                      <div className="first-speaker-card">
                        <div className="first-speaker-avatar">
                          {messageBreakdown.firstSpeaker.avatarUrl
                            ? <img src={messageBreakdown.firstSpeaker.avatarUrl} alt="" />
                            : <div className="avatar-placeholder"><User size={18} /></div>}
                        </div>
                        <span className="first-speaker-name">{messageBreakdown.firstSpeaker.displayName}</span>
                        <span className="first-speaker-badge">首位</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }


  const renderDetailPanel = () => {
    if (!selectedGroup) {
      return (
        <div className="placeholder">
          <Users size={64} />
          <p>请从左侧选择一个群聊进行分析</p>
        </div>
      )
    }
    if (!selectedFunction) {
      return renderFunctionMenu()
    }
    return renderFunctionContent()
  }

  return (
    <div className={`group-analytics-page standalone ${isResizing ? 'resizing' : ''}`} ref={containerRef}>
      {renderGroupList()}
      <div className="resize-handle" onMouseDown={() => setIsResizing(true)} />
      <div className="detail-area">
        <ChatBackground />
        {renderDetailPanel()}
      </div>
      {renderMemberModal()}
    </div>
  )
}

export default GroupAnalyticsPage
