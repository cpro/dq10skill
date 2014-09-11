#! ruby -E utf-8:utf-8
# coding: utf-8

dir = File.dirname(__FILE__)

refresh_item_cache = false

#オプション解析: -aオプション時商品キャッシュのリフレッシュ
require 'optparse'
opts = OptionParser.new
opts.on('-a') {|v| refresh_item_cache = true}
opts.parse!(ARGV)

if ARGV.size < 1
  index_html_path = "#{dir}/../monster.html"
else
  index_html_path = ARGV[0].to_s
end

require 'rubygems'
require 'haml'
require 'json'

ITEM_CACHE_PATH = "#{dir}/amazon_item_cache.json"

item_list = []

# -aオプション時、またはキャッシュが存在しない場合
# AWSから商品タイトル・画像URL等を取得する
if refresh_item_cache or !File.exist?(ITEM_CACHE_PATH)
  system("ruby #{dir}/refresh_amazon_cache.rb")
end

#キャッシュをロード
File.open(ITEM_CACHE_PATH, 'r') do |file|
  item_list = JSON.parse(file.read, symbolize_names: true)
end

# スキル等データロード
data = JSON.parse(File.read("#{dir}/../dq10skill-monster-data.json"))
# HAMLからHTML生成
File.open(index_html_path, 'w') do |file|
  file.puts Haml::Engine.new(File.read("#{dir}/monster.haml")).render(Object.new, {:data => data, :item_list => item_list})
end
