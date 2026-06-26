import React from 'react';
import { UserCircle2, ShieldCheck, CheckCheck, KeyRound, EyeOff, Eye as EyeIcon } from 'lucide-react';

const AccountTab = ({ profileForm, setProfileForm, profileLoading, profileMsg, handleUpdateProfile, pwForm, setPwForm, pwLoading, pwMsg, showPw, setShowPw, handleChangePw }) => (
    <div className="cd-account-grid">
        {/* Profile Form */}
        <section className="cd-form-card">
            <div className="cd-form-header">
                <div className="cd-form-icon cd-form-icon--profile">
                    <UserCircle2 size={22} />
                </div>
                <div>
                    <h2 className="cd-form-title">Thông tin cá nhân</h2>
                    <p className="cd-form-subtitle">Cập nhật thông tin liên lạc của bạn.</p>
                </div>
            </div>

            {profileMsg && (
                <div className={`cd-form-msg cd-form-msg--${profileMsg.type}`}>
                    {profileMsg.type === 'success' ? <ShieldCheck size={16} /> : <span>⚠</span>}
                    {profileMsg.text}
                </div>
            )}

            <form onSubmit={handleUpdateProfile} className="cd-form">
                <div>
                    <label className="cd-field-label">Họ và tên</label>
                    <input
                        type="text"
                        placeholder="Họ và tên"
                        value={profileForm.hoTen}
                        onChange={e => setProfileForm(f => ({ ...f, hoTen: e.target.value }))}
                        required
                        className="cd-field-input"
                    />
                </div>
                <div>
                    <label className="cd-field-label">Số điện thoại</label>
                    <input
                        type="tel"
                        placeholder="Số điện thoại"
                        value={profileForm.soDienThoai}
                        onChange={e => setProfileForm(f => ({ ...f, soDienThoai: e.target.value }))}
                        required
                        className="cd-field-input"
                    />
                </div>
                <button type="submit" disabled={profileLoading} className="cd-btn cd-btn--primary cd-btn--submit">
                    <CheckCheck size={16} />
                    {profileLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
            </form>
        </section>

        {/* Password Form */}
        <section className="cd-form-card">
            <div className="cd-form-header">
                <div className="cd-form-icon cd-form-icon--password">
                    <KeyRound size={22} />
                </div>
                <div>
                    <h2 className="cd-form-title">Đổi mật khẩu</h2>
                    <p className="cd-form-subtitle">Cập nhật mật khẩu để bảo mật tài khoản.</p>
                </div>
            </div>

            {pwMsg && (
                <div className={`cd-form-msg cd-form-msg--${pwMsg.type}`}>
                    {pwMsg.type === 'success' ? <ShieldCheck size={16} /> : <span>⚠</span>}
                    {pwMsg.text}
                </div>
            )}

            <form onSubmit={handleChangePw} className="cd-form">
                {/* Current Password */}
                <div>
                    <label className="cd-field-label">Mật khẩu hiện tại</label>
                    <div className="cd-pw-wrapper">
                        <input
                            type={showPw.cu ? 'text' : 'password'}
                            placeholder="Nhập mật khẩu hiện tại"
                            value={pwForm.matKhauCu}
                            onChange={e => setPwForm(f => ({ ...f, matKhauCu: e.target.value }))}
                            required
                            className="cd-field-input"
                            style={{ paddingRight: '2.75rem' }}
                        />
                        <button type="button" onClick={() => setShowPw(s => ({ ...s, cu: !s.cu }))} className="cd-pw-toggle">
                            {showPw.cu ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div>
                    <label className="cd-field-label">Mật khẩu mới</label>
                    <div className="cd-pw-wrapper">
                        <input
                            type={showPw.moi ? 'text' : 'password'}
                            placeholder="Ít nhất 6 ký tự"
                            value={pwForm.matKhauMoi}
                            onChange={e => setPwForm(f => ({ ...f, matKhauMoi: e.target.value }))}
                            required
                            className="cd-field-input"
                            style={{ paddingRight: '2.75rem' }}
                        />
                        <button type="button" onClick={() => setShowPw(s => ({ ...s, moi: !s.moi }))} className="cd-pw-toggle">
                            {showPw.moi ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="cd-field-label">Xác nhận mật khẩu mới</label>
                    <div className="cd-pw-wrapper">
                        <input
                            type={showPw.xacNhan ? 'text' : 'password'}
                            placeholder="Nhập lại mật khẩu mới"
                            value={pwForm.xacNhanMatKhau}
                            onChange={e => setPwForm(f => ({ ...f, xacNhanMatKhau: e.target.value }))}
                            required
                            className="cd-field-input"
                            style={{ paddingRight: '2.75rem' }}
                        />
                        <button type="button" onClick={() => setShowPw(s => ({ ...s, xacNhan: !s.xacNhan }))} className="cd-pw-toggle">
                            {showPw.xacNhan ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={pwLoading} className="cd-btn cd-btn--primary cd-btn--submit">
                    <KeyRound size={16} />
                    {pwLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
            </form>
        </section>
    </div>
);

export default AccountTab;
