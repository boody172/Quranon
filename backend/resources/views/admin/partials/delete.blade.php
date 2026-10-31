<form method="post" action="{{ $action }}" data-confirm="متأكد من الحذف؟ لا يمكن التراجع.">
    @csrf @method('delete')
    <button class="btn danger">حذف</button>
</form>
