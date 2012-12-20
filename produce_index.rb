#! ruby -E utf-8:utf-8
# coding: utf-8
require 'rubygems'
require 'haml'
require 'json'
require 'amazon/aws'
require 'amazon/aws/search'

# Ruby/AWS 設定
ENV['AMAZONRCDIR']  = '.'
ENV['AMAZONRCFILE'] = '.amazonrc'
include Amazon::AWS

asin_list = File.readlines('asin_list.txt').map { |e| e.chomp }
item_list = asin_list.map do |asin|
  il = ItemLookup.new('ASIN', {ItemId: asin})
  request = Search::Request.new
  
  retry_count = 0
  begin
    response = request.search il
  rescue HTTPError => e
    retry_count += 1
    if retry_count < 5
      STDOUT.puts "retrying #{asin} ..."
      sleep 1
      retry
    else
      raise e
    end
  end
  
  item = response.item_lookup_response.items.item
  {
    img_url: item.medium_image.url,
    img_height: item.medium_image.height,
    img_width: item.medium_image.width,
    item_url: item.detail_page_url,
    item_title: item.item_attributes.title
  }
end

data = JSON.parse(File.read('dq10skill-data.json'))
File.open('index.html', 'w') do |file|
  file.puts Haml::Engine.new(File.read('index.haml')).render(Object.new, {:data => data, :item_list => item_list})
end
